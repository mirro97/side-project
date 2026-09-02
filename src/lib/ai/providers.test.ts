import { describe, it, expect, vi, afterEach } from 'vitest'
import { adapterFor, callChat, describeError } from './providers'
import { PROVIDERS, type ChatMessage } from './types'

const MSGS: ChatMessage[] = [
  { role: 'user', text: '쉘리 어때?' },
  { role: 'assistant', text: '근접형입니다.' },
  { role: 'user', text: '기어는?' },
]

function bodyOf(init: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

function headersOf(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>
}

describe('공통 규약', () => {
  it('세 provider 모두 어댑터가 있다', () => {
    for (const p of PROVIDERS) expect(adapterFor(p)).toBeTruthy()
  })

  it('키가 URL 이나 헤더 어딘가에는 실린다', () => {
    for (const p of PROVIDERS) {
      const { url, init } = adapterFor(p).chat('SECRET', 'm', 's', MSGS)
      const blob = url + JSON.stringify(headersOf(init))
      expect(blob).toContain('SECRET')
    }
  })

  it('에러는 API 가 준 메시지를 그대로 쓴다', () => {
    // 세 provider 모두 { error: { message } } 형태라 하나로 처리한다
    const msg = describeError(401, { error: { message: 'API key not valid' } })
    expect(msg).toContain('API key not valid')
    expect(msg).toContain('AUTH')
  })

  it('에러 본문이 없어도 상태 코드로 말한다', () => {
    expect(describeError(500, null)).toContain('500')
    expect(describeError(429, null)).toContain('RATE')
  })

  it('상태 코드로 원인을 알 수 없으면 접두어를 붙이지 않는다', () => {
    // Gemini 는 잘못된 키에도 400 을 준다. "OTHER:" 는 정보가 아니다
    expect(describeError(400, { error: { message: 'API key not valid' } })).toBe(
      'API key not valid',
    )
  })

  it('어떤 할당량이 막혔는지 함께 보여준다', () => {
    // 메시지만 보면 모델 쿼터인지 검색 쿼터인지 구분이 안 된다
    const msg = describeError(429, {
      error: {
        message: 'You exceeded your current quota',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }],
          },
        ],
      },
    })
    expect(msg).toBe(
      'RATE: You exceeded your current quota [GenerateRequestsPerDayPerProjectPerModel-FreeTier]',
    )
  })

  it('할당량 정보가 없으면 메시지만 쓴다', () => {
    expect(describeError(429, { error: { message: 'slow down' } })).toBe('RATE: slow down')
  })

  it('예상 못 한 응답 형태에도 터지지 않는다', () => {
    for (const p of PROVIDERS) {
      const a = adapterFor(p)
      expect(a.parseChat(null).text).toBe('')
      expect(a.parseChat({}).text).toBe('')
      expect(a.parseChat({ weird: 1 }).text).toBe('')
      expect(a.parseModels(null)).toEqual([])
      expect(a.parseModels({})).toEqual([])
    }
  })
})

describe('gemini', () => {
  const a = adapterFor('gemini')

  it('채팅은 interactions 로, 키는 헤더로 보낸다', () => {
    // :generateContent 는 은퇴했다. 전 모델이 404 다 (2026-09-02 실측)
    const call = a.chat('K', 'gemini-x', 's', MSGS)
    expect(call.url).toContain('/interactions')
    expect(call.url).not.toContain('generateContent')
    expect(headersOf(call.init)['x-goog-api-key']).toBe('K')
  })

  it('목록 조회는 키를 쿼리로 보낸다', () => {
    expect(a.listModels('K').url).toContain('?key=K')
  })

  it('assistant 를 model_output 스텝으로 바꿔 보낸다', () => {
    // role: user/model 을 쓰는 턴 목록은 거부된다 (use step_list instead of turn_list)
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    const input = body.input as { type: string }[]
    expect(input.map(c => c.type)).toEqual(['user_input', 'model_output', 'user_input'])
  })

  it('시스템 프롬프트를 최상위 문자열로 보낸다', () => {
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    expect(body.system_instruction).toBe('SYS')
  })

  it('models/ 접두어를 벗기고 텍스트 모델만 남긴다', () => {
    const models = a.parseModels({
      models: [
        { name: 'models/gemini-a', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embed-b', supportedGenerationMethods: ['embedContent'] },
      ],
    })
    expect(models).toEqual(['gemini-a'])
  })

  it('model_output 스텝의 텍스트만 이어 붙인다', () => {
    // thought 스텝이 함께 오는데 그건 답이 아니다
    expect(
      a.parseChat({
        steps: [
          { type: 'thought', signature: 'xx' },
          { type: 'model_output', content: [{ type: 'text', text: 'ab' }, { type: 'text', text: 'cd' }] },
        ],
      }).text,
    ).toBe('abcd')
  })

  it('검색 도구를 켜서 보낸다', () => {
    // type 없이 { google_search: {} } 로 보내면 400 이다 (실측)
    expect(bodyOf(a.chat('K', 'm', 's', MSGS).init).tools).toEqual([{ type: 'google_search' }])
  })

  it('검색을 끄면 도구를 빼고 보낸다', () => {
    // 그라운딩 할당량이 막혔을 때 검색 없이 다시 부르는 경로다
    const body = bodyOf(a.chat('K', 'm', 's', MSGS, { search: false }).init)
    expect(body.tools).toBeUndefined()
    expect(body.input).toBeDefined()
  })

  it('검색 추천 위젯을 어디에 있든 찾아낸다', () => {
    // 이 HTML 을 화면에 그리는 것이 그라운딩 ToS 의무인데, 새 API 가 이걸
    // 어디에 넣는지는 확인하지 못했다 (검색 쿼터가 막혀 성공 응답을 못 봤다).
    // 경로를 지어내는 대신 훑어서 찾는다
    const r = a.parseChat({
      steps: [
        { type: 'model_output', content: [{ type: 'text', text: 'hi' }] },
        { grounding: { searchEntryPoint: { renderedContent: '<div>chips</div>' } } },
      ],
    })
    expect(r.text).toBe('hi')
    expect(r.searchWidget).toBe('<div>chips</div>')
  })

  it('그라운딩을 안 탄 응답에는 위젯이 없다', () => {
    const r = a.parseChat({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'hi' }] }] })
    expect(r.searchWidget).toBeUndefined()
  })
})

describe('openai', () => {
  const a = adapterFor('openai')

  it('Bearer 로 인증한다', () => {
    expect(headersOf(a.listModels('K').init).authorization).toBe('Bearer K')
  })

  it('시스템 프롬프트를 첫 메시지로 넣는다', () => {
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    const msgs = body.messages as { role: string; content: string }[]
    expect(msgs[0]).toEqual({ role: 'system', content: 'SYS' })
    expect(msgs.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user'])
  })

  it('대화 모델만 목록에 남긴다', () => {
    expect(a.parseModels({ data: [{ id: 'gpt-x' }, { id: 'o9' }, { id: 'whisper-1' }] })).toEqual([
      'gpt-x',
      'o9',
    ])
  })

  it('응답을 꺼낸다', () => {
    expect(a.parseChat({ choices: [{ message: { content: 'hi' } }] }).text).toBe('hi')
  })
})

describe('anthropic', () => {
  const a = adapterFor('anthropic')

  it('브라우저 직접 호출 헤더가 반드시 붙는다', () => {
    // 이 헤더가 없으면 CORS 로 막힌다 (실측: TypeError: Failed to fetch)
    for (const call of [a.listModels('K'), a.chat('K', 'm', 's', MSGS)]) {
      expect(headersOf(call.init)['anthropic-dangerous-direct-browser-access']).toBe('true')
      expect(headersOf(call.init)['anthropic-version']).toBeTruthy()
      expect(headersOf(call.init)['x-api-key']).toBe('K')
    }
  })

  it('system 은 messages 가 아니라 최상위 필드다', () => {
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    expect(body.system).toBe('SYS')
    const msgs = body.messages as { role: string }[]
    expect(msgs.map(m => m.role)).toEqual(['user', 'assistant', 'user'])
  })

  it('max_tokens 를 반드시 보낸다', () => {
    // 없으면 400 이 난다
    expect(bodyOf(a.chat('K', 'm', 's', MSGS).init).max_tokens).toBeGreaterThan(0)
  })

  it('text 블록만 이어 붙인다', () => {
    expect(
      a.parseChat({
        content: [
          { type: 'thinking', thinking: '무시' },
          { type: 'text', text: 'ab' },
          { type: 'text', text: 'cd' },
        ],
      }).text,
    ).toBe('abcd')
  })
})

/** fetch 를 세워 두고 호출 횟수와 body 를 본다 */
function stubFetch(responses: { status: number; json: unknown }[]) {
  const calls: { url: string; body: Record<string, unknown> }[] = []
  let i = 0
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({ url, body: bodyOf(init) })
    const r = responses[Math.min(i++, responses.length - 1)]
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => Promise.resolve(r.json),
    } as Response)
  })
  return calls
}

describe('callChat 의 검색 폴백', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** 검색 여부에 따라 다른 프롬프트가 나가는지 보려고 값을 다르게 준다 */
  const SYS = (search: boolean) => (search ? 'SYS+search' : 'SYS')

  const OK = { steps: [{ type: 'model_output', content: [{ type: 'text', text: '답' }] }] }
  const QUOTA = { error: { message: 'You exceeded your current quota' } }

  it('429 면 검색을 빼고 한 번 다시 부른다', () => {
    const calls = stubFetch([
      { status: 429, json: QUOTA },
      { status: 200, json: OK },
    ])
    return callChat('gemini', 'K', 'm', SYS, MSGS).then(res => {
      expect(calls).toHaveLength(2)
      expect(calls[0].body.tools).toEqual([{ type: 'google_search' }])
      // 두 번째는 검색을 빼고 나가야 한다
      expect(calls[1].body.tools).toBeUndefined()
      expect(res.ok).toBe(true)
      expect(res.text).toBe('답')
      expect(res.searchSkipped).toBe(true)
    })
  })

  it('재시도에는 검색 지시가 빠진 프롬프트를 보낸다', () => {
    // 그대로 재사용하면 모델이 "검색해 볼게요" 라고 약속해 놓고 검색 없이 답한다
    const calls = stubFetch([
      { status: 429, json: QUOTA },
      { status: 200, json: OK },
    ])
    return callChat('gemini', 'K', 'm', SYS, MSGS).then(() => {
      expect(calls[0].body.system_instruction).toBe('SYS+search')
      expect(calls[1].body.system_instruction).toBe('SYS')
    })
  })

  it('재시도도 막히면 원래 오류를 보여준다', () => {
    const calls = stubFetch([{ status: 429, json: QUOTA }])
    return callChat('gemini', 'K', 'm', SYS, MSGS).then(res => {
      expect(calls).toHaveLength(2)
      expect(res.ok).toBe(false)
      expect(res.text).toMatch(/^RATE:/)
      expect(res.searchSkipped).toBeUndefined()
    })
  })

  it('검색을 끄고 부르면 한 번만 나가고 최신이 아님을 알린다', () => {
    // 앞선 질문에서 이미 막힌 걸 확인한 경우다. 실패할 호출을 또 보내지 않는다
    const calls = stubFetch([{ status: 200, json: OK }])
    return callChat('gemini', 'K', 'm', SYS, MSGS, { search: false }).then(res => {
      expect(calls).toHaveLength(1)
      expect(calls[0].body.tools).toBeUndefined()
      expect(res.searchSkipped).toBe(true)
    })
  })

  it('검색을 안 쓰는 provider 는 searchSkipped 를 붙이지 않는다', () => {
    // 애초에 검색이 없는 provider 라 "검색 없이 답했다"는 안내가 뜨면 안 된다
    stubFetch([{ status: 200, json: { choices: [{ message: { content: '답' } }] } }])
    return callChat('openai', 'K', 'm', SYS, MSGS, { search: false }).then(res => {
      expect(res.searchSkipped).toBeUndefined()
    })
  })

  it('429 가 아니면 다시 부르지 않는다', () => {
    const calls = stubFetch([{ status: 401, json: { error: { message: 'bad key' } } }])
    return callChat('gemini', 'K', 'm', SYS, MSGS).then(res => {
      expect(calls).toHaveLength(1)
      expect(res.text).toMatch(/^AUTH:/)
    })
  })

  it('검색을 안 쓰는 provider 는 429 여도 다시 부르지 않는다', () => {
    const calls = stubFetch([{ status: 429, json: QUOTA }])
    return callChat('openai', 'K', 'm', SYS, MSGS).then(() => {
      expect(calls).toHaveLength(1)
    })
  })
})
