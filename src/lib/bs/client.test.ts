import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encodeTag, isValidTag, bsFetch } from './client'
import { BsError } from './errors'

describe('태그 처리', () => {
  it('유효 문자만 통과시킨다', () => {
    expect(isValidTag('#2VUL0L00R')).toBe(true)
    expect(isValidTag('2vul0l00r')).toBe(true)
    // B, D, E, F, H, I 등은 브롤스타즈 태그에 없는 문자다
    expect(isValidTag('#ABCDEF')).toBe(false)
    expect(isValidTag('#1234')).toBe(false)
    expect(isValidTag('')).toBe(false)
  })
  it('# 을 붙이고 URL 인코딩한다', () => {
    expect(encodeTag('2VUL0L00R')).toBe('%232VUL0L00R')
    expect(encodeTag('#2vul0l00r')).toBe('%232VUL0L00R')
  })
})

describe('bsFetch', () => {
  beforeEach(() => { vi.stubEnv('BRAWL_STARS_TOKEN', 'test-token') })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('프록시 URL과 Bearer 헤더를 쓴다', async () => {
    const spy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await bsFetch('/brawlers')
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('https://bsproxy.royaleapi.dev/v1/brawlers')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
  })

  it('503을 Maintenance 로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    await expect(bsFetch('/brawlers')).rejects.toMatchObject({ kind: 'Maintenance' })
  })

  it('404를 NotFound BsError 로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(bsFetch('/players/x')).rejects.toBeInstanceOf(BsError)
    await expect(bsFetch('/players/x')).rejects.toMatchObject({ kind: 'NotFound' })
  })

  it('토큰이 없으면 호출조차 하지 않는다', async () => {
    vi.stubEnv('BRAWL_STARS_TOKEN', '')
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    await expect(bsFetch('/brawlers')).rejects.toMatchObject({ kind: 'Forbidden' })
    expect(spy).not.toHaveBeenCalled()
  })
})
