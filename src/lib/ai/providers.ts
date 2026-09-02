import type { Adapter, Call, ChatMessage, ChatReply, Provider } from './types'

/** 응답 형태가 바뀌어도 터지지 않게, 꺼낼 때마다 모양을 확인한다 */
function pick(o: unknown, ...path: (string | number)[]): unknown {
  let cur: unknown = o
  for (const k of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string | number, unknown>)[k]
  }
  return cur
}

function messageFrom(json: unknown, fallback: string): string {
  const m = pick(json, 'error', 'message')
  return typeof m === 'string' && m ? m : fallback
}

/**
 * 접두어는 정보가 있을 때만 붙인다.
 * Gemini 는 잘못된 키에도 400 을 주므로 상태 코드만으로 인증 문제를 가릴 수 없다
 * (실측: 400 "API key not valid"). 그런 경우 API 메시지가 이미 원인을 말한다.
 */
function statusHint(status: number): string | null {
  if (status === 401 || status === 403) return 'AUTH'
  if (status === 429) return 'RATE'
  return null
}

/**
 * 어떤 할당량이 막혔는지.
 *
 * 429 메시지는 "you exceeded your current quota" 라고만 해서 **모델 쿼터인지
 * 검색 그라운딩 쿼터인지 구분이 안 된다.** Gemini 는 본문에 그 id 를 넣어주는데
 * 메시지만 꺼내면서 버리고 있었다. BYOK 라 사용자가 직접 판단해야 해서 함께 보여준다.
 */
function quotaId(json: unknown): string | null {
  const details = pick(json, 'error', 'details')
  if (!Array.isArray(details)) return null
  for (const d of details) {
    const violations = pick(d, 'violations')
    if (!Array.isArray(violations)) continue
    for (const v of violations) {
      const id = pick(v, 'quotaId') ?? pick(v, 'quotaMetric')
      if (typeof id === 'string' && id) return id
    }
  }
  return null
}

/**
 * API 가 준 메시지를 그대로 쓴다. 우리가 지어내지 않는다.
 * 세 provider 모두 { error: { message } } 형태라 어댑터별로 나눌 이유가 없었다.
 */
export function describeError(status: number, json: unknown): string {
  const hint = statusHint(status)
  const message = messageFrom(json, `HTTP ${status}`)
  const quota = quotaId(json)
  const body = quota ? `${message} [${quota}]` : message
  return hint ? `${hint}: ${body}` : body
}

const GEMINI_BASE = process.env.NEXT_PUBLIC_GEMINI_BASE ?? 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Gemini 는 `:generateContent` 를 은퇴시키고 Interactions API 로 옮겼다.
 *
 * 2026-09-02 실측: 구 엔드포인트는 **모든 모델에서 404** 를 준다
 * ("no longer available to new users ... We recommend you to use the Interactions API").
 * 429 가 아니라 404 이고, 같은 키로 interactions 는 200 이 온다 — 쿼터 문제가 아니다.
 *
 * 요청 모양이 완전히 다르다. contents/parts/role 은 전부 거부된다.
 */
function geminiHeaders(key: string): HeadersInit {
  return { 'x-goog-api-key': key, 'content-type': 'application/json' }
}

/**
 * 그라운딩 위젯을 응답 어디에 넣는지 확인하지 못했다 — 검색 쿼터가 막혀 있어
 * 성공한 그라운딩 응답을 한 번도 못 봤다. 경로를 지어내는 대신 훑어서 찾는다.
 * 표시가 ToS 의무라 못 찾으면 안 그리는 쪽이 아니라, 찾으면 그리는 쪽으로 둔다.
 */
function findRenderedContent(node: unknown, depth = 0): string | undefined {
  if (depth > 6 || !node || typeof node !== 'object') return undefined
  const entry = pick(node, 'searchEntryPoint', 'renderedContent')
  if (typeof entry === 'string' && entry) return entry
  for (const v of Object.values(node as Record<string, unknown>)) {
    const hit = findRenderedContent(v, depth + 1)
    if (hit) return hit
  }
  return undefined
}

const gemini: Adapter = {
  listModels(key) {
    return { url: `${GEMINI_BASE}/models?key=${encodeURIComponent(key)}`, init: { method: 'GET' } }
  },
  parseModels(json) {
    const models = pick(json, 'models')
    if (!Array.isArray(models)) return []
    return models
      .filter(m => {
        // 텍스트 생성을 지원하는 것만 고른다. 임베딩·TTS 모델이 섞여 온다
        const methods = pick(m, 'supportedGenerationMethods')
        return !Array.isArray(methods) || methods.includes('generateContent')
      })
      .map(m => pick(m, 'name'))
      .filter((n): n is string => typeof n === 'string')
      // "models/gemini-…" 형태라 접두어를 벗긴다
      .map(n => n.replace(/^models\//, ''))
  },
  chat(key, model, system, messages, opts) {
    const search = opts?.search !== false
    return {
      url: `${GEMINI_BASE}/interactions`,
      init: {
        method: 'POST',
        headers: geminiHeaders(key),
        body: JSON.stringify({
          model,
          system_instruction: system,
          // 스텝 목록이다. role: user/model 을 쓰는 턴 목록은 거부된다
          // ("use step_list input format instead of turn_list" — 실측)
          input: messages.map(m => ({
            type: m.role === 'assistant' ? 'model_output' : 'user_input',
            content: [{ type: 'text', text: m.text }],
          })),
          // type 없이 { google_search: {} } 로 보내면 400 이다 (실측)
          ...(search ? { tools: [{ type: 'google_search' }] } : {}),
        }),
      },
    }
  },
  parseChat(json) {
    const steps = pick(json, 'steps')
    const text = Array.isArray(steps)
      ? steps
          .filter(s => pick(s, 'type') === 'model_output')
          .flatMap(s => {
            const c = pick(s, 'content')
            return Array.isArray(c) ? c : []
          })
          .filter(c => pick(c, 'type') === 'text')
          .map(c => pick(c, 'text'))
          .filter((t): t is string => typeof t === 'string')
          .join('')
      : ''
    return { text, searchWidget: findRenderedContent(json) }
  },
}

const OPENAI_BASE = 'https://api.openai.com/v1'

function bearer(key: string): HeadersInit {
  return { authorization: `Bearer ${key}`, 'content-type': 'application/json' }
}

const openai: Adapter = {
  listModels(key) {
    return { url: `${OPENAI_BASE}/models`, init: { method: 'GET', headers: bearer(key) } }
  },
  parseModels(json) {
    const data = pick(json, 'data')
    if (!Array.isArray(data)) return []
    return data
      .map(m => pick(m, 'id'))
      .filter((id): id is string => typeof id === 'string')
      .filter(id => id.startsWith('gpt') || id.startsWith('o'))
  },
  chat(key, model, system, messages) {
    return {
      url: `${OPENAI_BASE}/chat/completions`,
      init: {
        method: 'POST',
        headers: bearer(key),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            ...messages.map(m => ({ role: m.role, content: m.text })),
          ],
        }),
      },
    }
  },
  parseChat(json) {
    const text = pick(json, 'choices', 0, 'message', 'content')
    return { text: typeof text === 'string' ? text : '' }
  },
}

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1'

/**
 * 이 헤더가 없으면 브라우저에서 CORS 로 막힌다 (실측: TypeError: Failed to fetch).
 * 넣으면 401 이 정상적으로 돌아온다.
 */
function anthropicHeaders(key: string): HeadersInit {
  return {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'content-type': 'application/json',
  }
}

/** Anthropic 은 max_tokens 가 필수다 */
const ANTHROPIC_MAX_TOKENS = 2048

const anthropic: Adapter = {
  listModels(key) {
    return {
      url: `${ANTHROPIC_BASE}/models`,
      init: { method: 'GET', headers: anthropicHeaders(key) },
    }
  },
  parseModels(json) {
    const data = pick(json, 'data')
    if (!Array.isArray(data)) return []
    return data.map(m => pick(m, 'id')).filter((id): id is string => typeof id === 'string')
  },
  chat(key, model, system, messages) {
    return {
      url: `${ANTHROPIC_BASE}/messages`,
      init: {
        method: 'POST',
        headers: anthropicHeaders(key),
        body: JSON.stringify({
          model,
          max_tokens: ANTHROPIC_MAX_TOKENS,
          // system 은 messages 배열이 아니라 최상위 필드다
          system,
          messages: messages.map(m => ({ role: m.role, content: m.text })),
        }),
      },
    }
  },
  parseChat(json) {
    const blocks = pick(json, 'content')
    if (!Array.isArray(blocks)) return { text: '' }
    return {
      text: blocks
        .filter(b => pick(b, 'type') === 'text')
        .map(b => pick(b, 'text'))
        .filter((t): t is string => typeof t === 'string')
        .join(''),
    }
  },
}

const ADAPTERS: Record<Provider, Adapter> = { gemini, openai, anthropic }

export function adapterFor(provider: Provider): Adapter {
  return ADAPTERS[provider]
}

export interface CallResult extends ChatReply {
  ok: boolean
  /** ok 면 본문, 아니면 API 가 준 에러 메시지 */
  text: string
  /** 검색 할당량이 막혀 검색 없이 답한 경우. 화면이 그 사실을 알린다 */
  searchSkipped?: boolean
  /** 재시도 판단용. UI 는 쓰지 않는다 */
  status?: number
}

/**
 * 웹검색을 붙인 provider. 지금은 Gemini 하나다.
 *
 * OpenAI 는 검색을 켜려면 `gpt-4o-search-preview` 계열로 **모델이 강제**돼서
 * 모델을 직접 고르는 BYOK 와 부딪힌다. Anthropic 은 도구 방식이라 모델 제약이 없어
 * 다음 순서로 붙이기 좋다.
 *
 * 켜진 provider 와 아닌 provider 가 눈에 띄게 다르게 답하므로 화면에 표시한다.
 */
const SEARCH_PROVIDERS = new Set<Provider>(['gemini'])

export function supportsSearch(provider: Provider): boolean {
  return SEARCH_PROVIDERS.has(provider)
}

/**
 * 브라우저가 직접 부른다. 우리 서버를 거치지 않는다.
 *
 * **검색 그라운딩은 모델 호출과 별개 할당량을 쓴다** (무료 5,000프롬프트/월,
 * 유료도 하루 1,500건까지만 무료). 그쪽만 소진돼도 429 가 나는데, 검색을 빼면
 * 답할 수 있는 질문이 대부분이다. 통째로 막지 말고 한 번만 검색 없이 다시 부른다.
 *
 * 시스템 프롬프트를 문자열이 아니라 **함수로 받는 이유가 여기 있다** — 재시도에는
 * 검색 지시가 빠진 프롬프트가 필요하다. 그대로 재사용하면 모델이 "웹 검색으로
 * 확인해 볼게요" 라고 약속해 놓고 검색 없이 답한다 (실측).
 *
 * 두 번째가 성공하면 그 자체로 진단이다 — 막힌 건 모델이 아니라 검색이었다.
 * 호출부는 그때 `searchSkipped` 를 보고 다음 질문부터 검색을 꺼야 한다.
 */
export async function callChat(
  provider: Provider,
  key: string,
  model: string,
  buildSystem: (search: boolean) => string,
  messages: ChatMessage[],
  opts?: { search?: boolean },
): Promise<CallResult> {
  const a = adapterFor(provider)
  const search = opts?.search !== false && supportsSearch(provider)

  const first = await run(a.chat(key, model, buildSystem(search), messages, { search }), a)
  // 이미 검색을 끄고 보낸 경우. 성공했으면 최신이 아니라는 사실만 함께 알린다
  if (!search) {
    return first.ok && supportsSearch(provider) ? { ...first, searchSkipped: true } : first
  }
  if (first.ok || first.status !== 429) return first

  // 어떤 할당량이 막혔는지는 first.text 에 들어 있다. 재시도가 성공하면 화면에서 사라지므로 남긴다
  console.warn(`[ai] 검색 그라운딩이 막혀 검색 없이 재시도합니다 — ${first.text}`)
  const retry = await run(a.chat(key, model, buildSystem(false), messages, { search: false }), a)
  // 재시도도 막혔으면 원래 오류를 보여준다. 두 번째 메시지가 더 정확하지 않다
  return retry.ok ? { ...retry, searchSkipped: true } : first
}

export async function callModels(provider: Provider, key: string): Promise<string[] | null> {
  const a = adapterFor(provider)
  try {
    const { url, init } = a.listModels(key)
    const res = await fetch(url, init)
    if (!res.ok) return null
    return a.parseModels(await res.json())
  } catch {
    // 목록을 못 받아도 막다른 길이 아니다. 사용자가 직접 입력한다
    return null
  }
}

async function run(call: Call, a: Adapter): Promise<CallResult> {
  let res: Response
  try {
    res = await fetch(call.url, call.init)
  } catch (e) {
    // CORS 차단이나 네트워크 단절은 여기로 온다
    return { ok: false, text: `NETWORK: ${e instanceof Error ? e.message : 'fetch failed'}` }
  }
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) return { ok: false, text: describeError(res.status, json), status: res.status }
  const reply = a.parseChat(json)
  return reply.text ? { ok: true, ...reply } : { ok: false, text: 'EMPTY: 응답이 비어 있습니다' }
}
