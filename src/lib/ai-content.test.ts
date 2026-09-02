import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchAiContent, getAiTrait, aiTraitCount } from './ai-content'

describe('getAiTrait', () => {
  it('생성물이 없는 id 는 undefined 다', () => {
    // 106종이 다 차기 전에도 호출부가 그냥 폴백할 수 있어야 한다
    expect(getAiTrait(99999999, 'ko')).toBeUndefined()
  })

  it('색인 크기를 셀 수 있다', () => {
    expect(aiTraitCount()).toBeGreaterThanOrEqual(0)
  })
})

describe('fetchAiContent', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('파일이 있으면 내용을 준다', () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ howToPlay: 'a', gears: 'b', trait: 'c' }),
      } as Response),
    )
    return fetchAiContent('ko', 16000000).then(r => expect(r?.trait).toBe('c'))
  })

  it('404 면 null 이고 던지지 않는다', () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false } as Response))
    return fetchAiContent('ko', 16000000).then(r => expect(r).toBeNull())
  })

  it('네트워크가 끊겨도 null 이다', () => {
    // 생성물이 없다고 상세 패널이 깨지면 안 된다
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')))
    return fetchAiContent('ko', 16000000).then(r => expect(r).toBeNull())
  })
})
