import { describe, it, expect } from 'vitest'
import { adapterFor, describeError } from './providers'
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

  it('예상 못 한 응답 형태에도 터지지 않는다', () => {
    for (const p of PROVIDERS) {
      const a = adapterFor(p)
      expect(a.parseChat(null)).toBe('')
      expect(a.parseChat({})).toBe('')
      expect(a.parseChat({ weird: 1 })).toBe('')
      expect(a.parseModels(null)).toEqual([])
      expect(a.parseModels({})).toEqual([])
    }
  })
})

describe('gemini', () => {
  const a = adapterFor('gemini')

  it('키를 쿼리 파라미터로 보낸다', () => {
    expect(a.listModels('K').url).toContain('?key=K')
    expect(a.chat('K', 'gemini-x', 's', MSGS).url).toContain('generateContent?key=K')
  })

  it('assistant 를 model 로 바꿔 보낸다', () => {
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    const contents = body.contents as { role: string }[]
    expect(contents.map(c => c.role)).toEqual(['user', 'model', 'user'])
  })

  it('시스템 프롬프트를 전용 필드로 보낸다', () => {
    const body = bodyOf(a.chat('K', 'm', 'SYS', MSGS).init)
    expect(JSON.stringify(body.system_instruction)).toContain('SYS')
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

  it('여러 part 를 이어 붙인다', () => {
    expect(
      a.parseChat({ candidates: [{ content: { parts: [{ text: 'ab' }, { text: 'cd' }] } }] }),
    ).toBe('abcd')
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
    expect(a.parseChat({ choices: [{ message: { content: 'hi' } }] })).toBe('hi')
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
      }),
    ).toBe('abcd')
  })
})
