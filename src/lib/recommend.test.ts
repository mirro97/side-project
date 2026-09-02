import { describe, it, expect } from 'vitest'
import {
  AXES,
  accountVector,
  axisBand,
  blend,
  dominantAxis,
  matchingAxes,
  standoutAxes,
  recommend,
  score,
  type Vector,
} from './recommend'
import { getBrawlers } from './game-data'
import type { PlayerBrawler } from '@/types/api'
import type { Brawler } from '@/types/game'

const ALL = getBrawlers()

function v(range: number, durability: number, mobility: number, risk: number): Vector {
  return { range, durability, mobility, risk }
}

/** 트로피만 다른 최소 형태 */
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

describe('score', () => {
  it('같은 벡터면 1 이다', () => {
    expect(score(v(0.5, 0.5, 0.5, 0.5), v(0.5, 0.5, 0.5, 0.5))).toBe(1)
  })
  it('최대 거리에서 0 이다', () => {
    // 4축이 0~1 이라 최대 거리는 2
    expect(score(v(0, 0, 0, 0), v(1, 1, 1, 1))).toBeCloseTo(0, 10)
  })
  it('가까울수록 높다', () => {
    const t = v(1, 0.2, 0.5, 0.2)
    expect(score(t, v(0.9, 0.2, 0.5, 0.2))).toBeGreaterThan(score(t, v(0.2, 0.9, 0.5, 0.2)))
  })
})

describe('blend', () => {
  it('계정이 없으면 설문이 그대로다', () => {
    const q = v(1, 0, 0.5, 0.3)
    expect(blend(q, null)).toEqual(q)
  })
  it('기본 비율은 절반씩이다', () => {
    expect(blend(v(1, 1, 1, 1), v(0, 0, 0, 0))).toEqual(v(0.5, 0.5, 0.5, 0.5))
  })
})

describe('accountVector', () => {
  it('보유가 없으면 null 이다', () => {
    expect(accountVector([], ALL)).toBeNull()
  })

  it('상위 10종만 본다 — 전체 평균과 달라야 신호가 있다', () => {
    // 106종을 거의 같은 트로피로 보유한 상위권 계정을 흉내낸다.
    // 전체를 평균 내면 전체 평균과 같아져 신호가 사라진다
    const brawlers = ALL.map((b, i) => owned(b.id, 3000 - i))
    const P = accountVector(brawlers, ALL) as Vector
    const globalMean = Object.fromEntries(
      AXES.map(a => [a, ALL.reduce((s, b) => s + b.vector[a], 0) / ALL.length]),
    ) as Vector
    const deviation = AXES.reduce((s, a) => s + Math.abs(P[a] - globalMean[a]), 0)
    expect(deviation).toBeGreaterThan(0.05)
  })

  it('상위 10종의 단순 평균이다', () => {
    const top = ALL.slice(0, 10)
    const brawlers = ALL.map((b, i) => owned(b.id, i < 10 ? 3000 : 100))
    const P = accountVector(brawlers, ALL) as Vector
    for (const a of AXES) {
      expect(P[a]).toBeCloseTo(top.reduce((s, b) => s + b.vector[a], 0) / 10, 6)
    }
  })

  it('보유가 10종 미만이면 있는 만큼만 쓴다', () => {
    const three = ALL.slice(0, 3)
    const P = accountVector(three.map(b => owned(b.id, 1000)), ALL) as Vector
    for (const a of AXES) {
      expect(P[a]).toBeCloseTo(three.reduce((s, b) => s + b.vector[a], 0) / 3, 6)
    }
  })

  it('생성 데이터에 없는 브롤러는 무시한다', () => {
    expect(accountVector([owned(999999, 5000)], ALL)).toBeNull()
  })
})

describe('matchingAxes', () => {
  it('차이가 큰 축은 일치로 치지 않는다', () => {
    expect(matchingAxes(v(1, 0, 0, 0), v(0, 1, 1, 1))).toEqual([])
  })
  it('가까운 축부터 최대 2개를 준다', () => {
    const axes = matchingAxes(v(0.5, 0.5, 0.5, 0.5), v(0.5, 0.52, 0.9, 0.9))
    expect(axes).toEqual(['range', 'durability'])
  })
})

describe('axisBand / dominantAxis', () => {
  it('3구간으로 나눈다', () => {
    expect(axisBand(0.1)).toBe('low')
    expect(axisBand(0.5)).toBe('mid')
    expect(axisBand(0.9)).toBe('high')
  })
  it('중간값에서 가장 먼 축이 두드러진 축이다', () => {
    expect(dominantAxis(v(0.95, 0.5, 0.6, 0.45))).toBe('range')
  })
  it('동점은 부동소수점이 아니라 축 순서로 가른다', () => {
    // |0.95-0.5| 는 0.44999…, |0.05-0.5| 는 0.45000… 이라 그냥 비교하면 risk 가 이긴다
    expect(dominantAxis(v(0.95, 0.1, 0.5, 0.05))).toBe('range')
  })
})

describe('standoutAxes', () => {
  it('파생 축(risk)은 설명에 쓰지 않는다', () => {
    // risk = (1−durability)(1−range) 라 같은 말을 두 번 하게 된다
    const axes = standoutAxes(v(0.95, 0.05, 0.5, 0.9))
    expect(axes.map(x => x.axis)).not.toContain('risk')
  })
  it('가장 치우친 축부터 준다', () => {
    expect(standoutAxes(v(0.95, 0.05, 0.5, 0)).map(x => `${x.axis}:${x.band}`)).toEqual([
      'range:high',
      'durability:low',
    ])
  })
  it('두드러지지 않으면 빈 배열이다', () => {
    expect(standoutAxes(v(0.5, 0.5, 0.5, 0.5))).toEqual([])
  })
})

describe('recommend', () => {
  it('계정이 없으면 한 목록으로 준다', () => {
    const r = recommend(v(1, 0.2, 0.5, 0.2), ALL, null)
    expect(r.single).toHaveLength(10)
    expect(r.familiar).toHaveLength(0)
    expect(r.fresh).toHaveLength(0)
  })

  it('원거리 성향에는 저격수가 상위에 온다', () => {
    const r = recommend(v(0.95, 0.2, 0.5, 0.2), ALL, null)
    const roles = r.single.slice(0, 5).map(s => s.brawler.role)
    expect(roles.filter(x => x === 'marksman' || x === 'artillery').length).toBeGreaterThan(0)
    // 사거리가 전부 평균 이상이어야 한다
    expect(r.single.slice(0, 5).every(s => s.brawler.vector.range > 0.6)).toBe(true)
  })

  it('근접·탱커 성향에는 체력이 높은 쪽이 온다', () => {
    const r = recommend(v(0.05, 0.95, 0.5, 0.1), ALL, null)
    expect(r.single.slice(0, 5).every(s => s.brawler.vector.durability > 0.6)).toBe(true)
  })

  it('계정이 있으면 트로피 중앙값으로 두 그룹을 나눈다', () => {
    const half = Math.floor(ALL.length / 2)
    const trophies = new Map<number, number>(
      ALL.map((b, i) => [b.id, i < half ? 3000 : 100] as const),
    )
    const r = recommend(v(0.5, 0.5, 0.5, 0.5), ALL, trophies)
    expect(r.familiar).toHaveLength(5)
    expect(r.fresh).toHaveLength(5)
    expect(r.single).toHaveLength(0)
    // familiar 는 전부 상위 트로피여야 한다
    expect(r.familiar.every(s => (trophies.get(s.brawler.id) ?? 0) >= 3000)).toBe(true)
    expect(r.fresh.every(s => (trophies.get(s.brawler.id) ?? 0) < 3000)).toBe(true)
  })

  it('점수 내림차순이다', () => {
    const r = recommend(v(0.7, 0.3, 0.6, 0.2), ALL, null)
    const scores = r.single.map(s => s.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })
})

describe('생성 데이터와의 연결', () => {
  it('전 종이 벡터를 갖는다', () => {
    // 종수는 게임 업데이트마다 늘어난다. 개수를 박으면 신규 브롤러마다 테스트가 깨진다
    expect(ALL.length).toBeGreaterThanOrEqual(106)
    expect(ALL.every((b: Brawler) => AXES.every(a => typeof b.vector[a] === 'number'))).toBe(true)
  })
})
