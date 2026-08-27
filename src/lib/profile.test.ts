import { describe, it, expect } from 'vitest'
import {
  addFavorite,
  normalizeTag,
  removeFavorite,
  summarizeBattles,
  summarizeBrawlers,
  visibleFavorites,
} from './profile'
import type { ParsedBattle, PlayerBrawler } from '@/types/api'

describe('normalizeTag', () => {
  it('# 유무와 대소문자를 맞춘다', () => {
    expect(normalizeTag('2gpp2p0p')).toBe('#2GPP2P0P')
    expect(normalizeTag('#2GPP2P0P')).toBe('#2GPP2P0P')
    expect(normalizeTag('  #2gpp2p0p  ')).toBe('#2GPP2P0P')
  })

  it('태그에 없는 문자는 거부한다', () => {
    // O·I·S 는 브롤스타즈 태그 문자 집합에 없다
    expect(normalizeTag('#2OPP')).toBeNull()
    expect(normalizeTag('#ABC')).toBeNull()
    expect(normalizeTag('')).toBeNull()
    expect(normalizeTag('#')).toBeNull()
  })
})

describe('즐겨찾기', () => {
  it('추가하면 정규화된 형태로 들어간다', () => {
    expect(addFavorite([], '2gpp2p0p')).toEqual(['#2GPP2P0P'])
  })

  it('표기가 달라도 같은 태그는 중복으로 넣지 않는다', () => {
    expect(addFavorite(['#2GPP2P0P'], '2gpp2p0p')).toEqual(['#2GPP2P0P'])
  })

  it('잘못된 태그는 목록을 바꾸지 않는다', () => {
    const list = ['#2GPP2P0P']
    expect(addFavorite(list, '#ABC')).toBe(list)
  })

  it('삭제도 표기 차이를 무시한다', () => {
    expect(removeFavorite(['#2GPP2P0P', '#QVLRCJQ00'], '2gpp2p0p')).toEqual(['#QVLRCJQ00'])
  })

  it('대표 계정은 목록에서 빠진다', () => {
    expect(visibleFavorites(['#2GPP2P0P', '#QVLRCJQ00'], '#2gpp2p0p')).toEqual(['#QVLRCJQ00'])
    expect(visibleFavorites(['#2GPP2P0P'], null)).toEqual(['#2GPP2P0P'])
  })
})

function battle(p: Partial<ParsedBattle>): ParsedBattle {
  return {
    battleTime: '20260824T080000.000Z',
    mode: 'brawlBall',
    map: null,
    brawlerId: null,
    result: null,
    rank: null,
    trophyChange: null,
    isStarPlayer: false,
    ...p,
  }
}

describe('summarizeBattles', () => {
  it('승패무를 집계하고 트로피 증감을 더한다', () => {
    const r = summarizeBattles([
      battle({ result: 'victory', trophyChange: 8 }),
      battle({ result: 'defeat', trophyChange: -6 }),
      battle({ result: 'draw', trophyChange: 0 }),
      battle({ result: 'victory', trophyChange: 7 }),
    ])
    expect(r).toEqual({ wins: 2, losses: 1, draws: 1, trophyDelta: 9 })
  })

  it('쇼다운은 승패에 들어가지 않고 트로피만 반영된다', () => {
    const r = summarizeBattles([battle({ result: null, rank: 2, trophyChange: 4 })])
    expect(r).toEqual({ wins: 0, losses: 0, draws: 0, trophyDelta: 4 })
  })

  it('trophyChange 가 없는 모드는 0으로 센다', () => {
    // 실측: megaBoss·tagTeam 응답에는 trophyChange 키가 없다
    expect(summarizeBattles([battle({ result: 'victory' })]).trophyDelta).toBe(0)
  })

  it('빈 목록도 처리한다', () => {
    expect(summarizeBattles([])).toEqual({ wins: 0, losses: 0, draws: 0, trophyDelta: 0 })
  })
})

function owned(id: number, trophies: number): PlayerBrawler {
  return {
    id,
    name: '',
    power: 11,
    rank: 1,
    trophies,
    highestTrophies: trophies,
    gears: [],
    starPowers: [],
    gadgets: [],
  }
}

describe('summarizeBrawlers', () => {
  it('트로피 상위 셋만 남긴다', () => {
    const r = summarizeBrawlers(
      [owned(1, 100), owned(2, 900), owned(3, 500), owned(4, 700)],
      106,
    )
    expect(r.ownedCount).toBe(4)
    expect(r.total).toBe(106)
    expect(r.top.map(b => b.id)).toEqual([2, 4, 3])
  })

  it('원본 배열을 정렬로 건드리지 않는다', () => {
    const list = [owned(1, 100), owned(2, 900)]
    summarizeBrawlers(list, 106)
    expect(list.map(b => b.id)).toEqual([1, 2])
  })

  it('보유가 없어도 터지지 않는다', () => {
    expect(summarizeBrawlers([], 106)).toEqual({ ownedCount: 0, total: 106, top: [] })
  })
})
