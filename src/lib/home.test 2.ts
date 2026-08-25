import { describe, it, expect } from 'vitest'
import { pickMainBrawler, sortByEndingSoon } from './home'
import type { EventSlot, PlayerBrawler } from '@/types/api'

const brawler = (id: number, trophies: number): PlayerBrawler => ({
  id,
  name: `B${id}`,
  power: 11,
  rank: 20,
  trophies,
  highestTrophies: trophies,
  gears: [],
  starPowers: [],
  gadgets: [],
})

describe('pickMainBrawler', () => {
  it('트로피가 가장 높은 브롤러를 고른다', () => {
    expect(pickMainBrawler([brawler(1, 500), brawler(2, 900), brawler(3, 700)])?.id).toBe(2)
  })
  it('보유 브롤러가 없으면 null 을 준다', () => {
    expect(pickMainBrawler([])).toBeNull()
  })
  it('동점이면 먼저 나온 쪽을 고른다', () => {
    expect(pickMainBrawler([brawler(7, 800), brawler(8, 800)])?.id).toBe(7)
  })
})

const slot = (id: number, end: string): EventSlot => ({
  startTime: '20260824T000000.000Z',
  endTime: end,
  slotId: id,
  event: { id, mode: 'brawlBall', modeId: 5, map: 'M' },
})

describe('sortByEndingSoon', () => {
  const now = new Date('2026-08-24T15:00:00Z')

  it('종료가 임박한 순으로 정렬한다', () => {
    const r = sortByEndingSoon(
      [slot(1, '20260824T200000.000Z'), slot(2, '20260824T160000.000Z')],
      now,
    )
    expect(r.map(s => s.slotId)).toEqual([2, 1])
  })

  it('이미 끝난 슬롯은 제외한다', () => {
    const r = sortByEndingSoon(
      [slot(1, '20260824T140000.000Z'), slot(2, '20260824T160000.000Z')],
      now,
    )
    expect(r.map(s => s.slotId)).toEqual([2])
  })

  it('시각을 파싱하지 못한 슬롯도 제외한다', () => {
    const r = sortByEndingSoon([slot(1, 'garbage'), slot(2, '20260824T160000.000Z')], now)
    expect(r.map(s => s.slotId)).toEqual([2])
  })
})
