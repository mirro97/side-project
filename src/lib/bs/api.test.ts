import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRankingsPlayersApi, getRankingsClubsApi, getEventsRotationApi } from './api'

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

beforeEach(() => vi.stubEnv('BRAWL_STARS_TOKEN', 't'))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('getRankingsPlayersApi', () => {
  it('국가코드와 limit 을 경로에 넣는다', async () => {
    const spy = vi.fn().mockResolvedValue(ok({ items: [], paging: { cursors: {} } }))
    vi.stubGlobal('fetch', spy)
    await getRankingsPlayersApi('global', 5)
    expect(spy.mock.calls[0][0]).toBe(
      'https://bsproxy.royaleapi.dev/v1/rankings/global/players?limit=5',
    )
  })

  it('커서가 있으면 after 를 붙인다', async () => {
    const spy = vi.fn().mockResolvedValue(ok({ items: [], paging: { cursors: {} } }))
    vi.stubGlobal('fetch', spy)
    await getRankingsPlayersApi('kr', 30, 'eyJwb3MiOjMwfQ')
    expect(spy.mock.calls[0][0]).toContain('&after=eyJwb3MiOjMwfQ')
  })
})

describe('getRankingsClubsApi', () => {
  it('clubs 경로를 쓴다', async () => {
    const spy = vi.fn().mockResolvedValue(ok({ items: [], paging: { cursors: {} } }))
    vi.stubGlobal('fetch', spy)
    await getRankingsClubsApi('global', 5)
    expect(spy.mock.calls[0][0]).toContain('/rankings/global/clubs?limit=5')
  })
})

describe('getEventsRotationApi', () => {
  it('배열을 그대로 준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok([{ slotId: 1 }])))
    expect(await getEventsRotationApi()).toHaveLength(1)
  })
})
