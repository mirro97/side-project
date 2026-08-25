import { describe, it, expect } from 'vitest'
import { parseBrawlTime, parseBattle } from './parse'

describe('parseBrawlTime', () => {
  it('변형 ISO를 Date로 바꾼다', () => {
    expect(parseBrawlTime('20260824T080000.000Z')?.toISOString()).toBe('2026-08-24T08:00:00.000Z')
  })
  it('형식이 다르면 null을 준다', () => {
    expect(parseBrawlTime('2026-08-24T08:00:00Z')).toBeNull()
    expect(parseBrawlTime('')).toBeNull()
  })
})

const ME = '#2VUL0L00R'

describe('parseBattle', () => {
  it('팀 모드는 teams에서 내 브롤러를 찾는다', () => {
    const r = parseBattle({
      battleTime: '20260824T080000.000Z',
      event: { mode: 'brawlBall', map: 'Spiraling Out' },
      battle: {
        mode: 'brawlBall', result: 'victory', trophyChange: 8,
        starPlayer: { tag: ME },
        teams: [
          [{ tag: ME, brawler: { id: 16000000 } }, { tag: '#A', brawler: { id: 16000001 } }],
          [{ tag: '#B', brawler: { id: 16000002 } }],
        ],
      },
    }, ME)
    expect(r).toEqual({
      battleTime: '20260824T080000.000Z', mode: 'brawlBall', map: 'Spiraling Out',
      brawlerId: 16000000, result: 'victory', rank: null,
      trophyChange: 8, isStarPlayer: true,
    })
  })

  it('쇼다운은 players 평면 배열에서 찾고 rank를 쓴다', () => {
    const r = parseBattle({
      battleTime: '20260824T090000.000Z',
      event: { mode: 'soloShowdown', map: 'Acid Lakes' },
      battle: {
        mode: 'soloShowdown', rank: 3, trophyChange: 4,
        players: [{ tag: '#C', brawler: { id: 16000005 } }, { tag: ME, brawler: { id: 16000009 } }],
      },
    }, ME)
    expect(r?.brawlerId).toBe(16000009)
    expect(r?.rank).toBe(3)
    expect(r?.result).toBeNull()
  })

  it('모르는 구조면 예외 대신 null을 준다', () => {
    expect(parseBattle({
      battleTime: '20260824T100000.000Z',
      event: { mode: 'futureMode', map: 'X' },
      battle: { mode: 'futureMode', participants: [] },
    }, ME)).toBeNull()
  })

  it('내가 참여하지 않은 배틀이면 null을 준다', () => {
    expect(parseBattle({
      battleTime: '20260824T110000.000Z',
      event: { mode: 'brawlBall', map: 'X' },
      battle: { mode: 'brawlBall', teams: [[{ tag: '#Z', brawler: { id: 1 } }]] },
    }, ME)).toBeNull()
  })
})
