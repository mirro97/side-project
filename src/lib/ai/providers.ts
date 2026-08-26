import type { Adapter, Call, ChatMessage, Provider } from './types'

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

function statusHint(status: number): string {
  if (status === 401 || status === 403) return 'AUTH'
  if (status === 429) return 'RATE'
  return 'OTHER'
}

/**
 * API 가 준 메시지를 그대로 쓴다. 우리가 지어내지 않는다.
 * 세 provider 모두 { error: { message } } 형태라 어댑터별로 나눌 이유가 없었다.
 */
export function describeError(status: number, json: unknown): string {
  return `${statusHint(status)}: ${messageFrom(json, `HTTP ${status}`)}`
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const gemini: Adapter = {
  listModels(key) {
    return { url: `${GEMINI_BASE}/models?key=${encodeURIComponent(key)}`, init: { method: 'GET' } }
  },
  parseModels(json) {
    const models = pick(json, 'models')
    if (!Array.isArray(models)) return []
    return models
      .filter(m => {
        // 텍스트 생성을 지원하는 것만 고른다. 임베딩 모델이 섞여 온다
        const methods = pick(m, 'supportedGenerationMethods')
        return !Array.isArray(methods) || methods.includes('generateContent')
      })
      .map(m => pick(m, 'name'))
      .filter((n): n is string => typeof n === 'string')
      // "models/gemini-…" 형태라 접두어를 벗긴다
      .map(n => n.replace(/^models\//, ''))
  },
  chat(key, model, system, messages) {
    return {
      url: `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: messages.map(m => ({
            // Gemini 는 assistant 를 model 이라고 부른다
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }],
          })),
        }),
      },
    }
  },
  parseChat(json) {
    const parts = pick(json, 'candidates', 0, 'content', 'parts')
    if (!Array.isArray(parts)) return ''
    return parts
      .map(p => pick(p, 'text'))
      .filter((t): t is string => typeof t === 'string')
      .join('')
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
    return typeof text === 'string' ? text : ''
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
    if (!Array.isArray(blocks)) return ''
    return blocks
      .filter(b => pick(b, 'type') === 'text')
      .map(b => pick(b, 'text'))
      .filter((t): t is string => typeof t === 'string')
      .join('')
  },
}

const ADAPTERS: Record<Provider, Adapter> = { gemini, openai, anthropic }

export function adapterFor(provider: Provider): Adapter {
  return ADAPTERS[provider]
}

export interface CallResult {
  ok: boolean
  /** ok 면 본문, 아니면 API 가 준 에러 메시지 */
  text: string
}

/** 브라우저가 직접 부른다. 우리 서버를 거치지 않는다 */
export async function callChat(
  provider: Provider,
  key: string,
  model: string,
  system: string,
  messages: ChatMessage[],
): Promise<CallResult> {
  const a = adapterFor(provider)
  return run(a.chat(key, model, system, messages), a)
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
  if (!res.ok) return { ok: false, text: describeError(res.status, json) }
  const text = a.parseChat(json)
  return text ? { ok: true, text } : { ok: false, text: 'EMPTY: 응답이 비어 있습니다' }
}
