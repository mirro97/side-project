import type { PlayerBrawler } from '@/types/api'
import type { Brawler } from '@/types/game'

export type Axis = 'range' | 'durability' | 'mobility' | 'risk'
export const AXES: Axis[] = ['range', 'durability', 'mobility', 'risk']

export type Vector = Record<Axis, number>

/** 설문 문항. 축이 없는 질문은 만들지 않는다 — 답을 받아도 점수에 반영할 수 없다 */
export interface Question {
  axis: Axis
  options: { key: string; value: number }[]
}

export const QUESTIONS: Question[] = [
  { axis: 'range', options: [
    { key: 'close', value: 0.1 },
    { key: 'mid', value: 0.5 },
    { key: 'far', value: 0.95 },
  ] },
  { axis: 'durability', options: [
    { key: 'back', value: 0.1 },
    { key: 'flex', value: 0.5 },
    { key: 'front', value: 0.95 },
  ] },
  { axis: 'mobility', options: [
    { key: 'power', value: 0.15 },
    { key: 'balance', value: 0.5 },
    { key: 'speed', value: 0.95 },
  ] },
  { axis: 'risk', options: [
    { key: 'safe', value: 0.05 },
    { key: 'even', value: 0.35 },
    { key: 'gamble', value: 0.65 },
  ] },
]

/**
 * 계정 벡터. 트로피 상위 N종의 단순 평균이다.
 *
 * 보유 전체를 트로피로 가중 평균하면 전체 평균과 같아져 신호가 사라진다.
 * 상위권 계정은 106종을 전부 보유하고 트로피도 몰려 있기 때문이다
 * (실측: 전체 가중 편차 0.001~0.009 vs 상위 10종 0.126~0.221).
 */
export function accountVector(brawlers: PlayerBrawler[], all: Brawler[], topN = 10): Vector | null {
  const vectorById = new Map(all.map(b => [b.id, b.vector]))
  const owned = brawlers
    .filter(b => vectorById.has(b.id))
    .sort((a, b) => b.trophies - a.trophies)
    .slice(0, topN)
  if (owned.length === 0) return null

  const out = { range: 0, durability: 0, mobility: 0, risk: 0 }
  for (const b of owned) {
    const v = vectorById.get(b.id) as Vector
    for (const a of AXES) out[a] += v[a]
  }
  for (const a of AXES) out[a] /= owned.length
  return out
}

/** 기본 혼합 비율. 계정이 없으면 설문이 전부다 */
export const DEFAULT_ALPHA = 0.5

export function blend(q: Vector, p: Vector | null, alpha = DEFAULT_ALPHA): Vector {
  if (!p) return { ...q }
  const a = alpha
  return {
    range: a * q.range + (1 - a) * p.range,
    durability: a * q.durability + (1 - a) * p.durability,
    mobility: a * q.mobility + (1 - a) * p.mobility,
    risk: a * q.risk + (1 - a) * p.risk,
  }
}

/**
 * 유클리드 거리 기반. 4축이 전부 0~1 이라 최대 거리는 2 다.
 *
 * 코사인은 쓰지 않는다. 모든 벡터가 1사분면에 몰려 상위권이 96~97% 로 붙는다.
 */
export function score(t: Vector, v: Vector): number {
  let sum = 0
  for (const a of AXES) sum += (t[a] - v[a]) ** 2
  return 1 - Math.sqrt(sum) / 2
}

/** 이 차이보다 벌어진 축은 "일치"라고 부르지 않는다 */
const MATCH_TOLERANCE = 0.15

/** 가장 잘 맞는 축. 숫자만으로는 변별이 안 되므로 이쪽이 주 정보다 */
export function matchingAxes(t: Vector, v: Vector, max = 2): Axis[] {
  return AXES.map(a => ({ a, diff: Math.abs(t[a] - v[a]) }))
    .filter(x => x.diff <= MATCH_TOLERANCE)
    .sort((x, y) => x.diff - y.diff)
    .slice(0, max)
    .map(x => x.a)
}

export type Band = 'low' | 'mid' | 'high'

/** 축 값을 3구간으로. 성향 문장 매핑에 쓴다 (4축 × 3구간 = 12문장) */
export function axisBand(v: number): Band {
  if (v < 0.34) return 'low'
  if (v < 0.67) return 'mid'
  return 'high'
}

/**
 * 사용자 성향에서 가장 두드러진 축. 중간값에서 가장 멀리 떨어진 쪽이다.
 *
 * 동점은 AXES 순서로 가른다. 0.95 와 0.05 는 둘 다 0.45 만큼 떨어져 있는데
 * 부동소수점으로는 0.44999… 와 0.45000… 이라 그냥 비교하면 결과가 뒤집힌다.
 */
const TIE = 1e-9

export function dominantAxis(t: Vector): Axis {
  return AXES.reduce(
    (best, a) => (Math.abs(t[a] - 0.5) > Math.abs(t[best] - 0.5) + TIE ? a : best),
    AXES[0],
  )
}

/**
 * 브롤러가 가장 두드러지는 축. 카드마다 다른 설명을 만드는 데 쓴다.
 *
 * risk 는 뺀다. risk = (1−durability)(1−range) 라 다른 두 축에서 파생된 값이고,
 * 함께 쓰면 "긴 사거리 · 안정적인 운영" 처럼 같은 말을 두 번 하게 된다.
 * 점수 계산에는 그대로 쓴다 — 설문이 묻는 축이기 때문이다.
 */
const DESCRIBABLE: Axis[] = ['range', 'durability', 'mobility']

export function standoutAxes(v: Vector, max = 2): { axis: Axis; band: Band }[] {
  return DESCRIBABLE.map((a, i) => ({ axis: a, order: i, dist: Math.abs(v[a] - 0.5) }))
    .filter(x => x.dist > 0.15)
    // dominantAxis 와 같은 이유로 동점은 축 순서로 가른다.
    // 0.95 와 0.05 는 부동소수점에서 0.44999… 와 0.45000… 이라 순서가 뒤집힌다
    .sort((x, y) => (Math.abs(y.dist - x.dist) < TIE ? x.order - y.order : y.dist - x.dist))
    .slice(0, max)
    .map(x => ({ axis: x.axis, band: axisBand(v[x.axis]) }))
}

export interface Scored {
  brawler: Brawler
  score: number
  axes: Axis[]
}

export const GROUP_SIZE = 5
/** 계정이 없어 그룹을 나눌 수 없을 때 보여줄 개수 */
export const SINGLE_LIST_SIZE = 10

/**
 * 두 그룹으로 나눈다.
 *
 * 보유 여부로는 가를 수 없다 — 실측한 계정 두 개 모두 106/106 보유였다.
 * 그 계정 안에서의 트로피 순위로 가른다.
 */
export function recommend(
  t: Vector,
  brawlers: Brawler[],
  ownedTrophies?: Map<number, number> | null,
): { familiar: Scored[]; fresh: Scored[]; single: Scored[] } {
  const ranked = brawlers
    .map(b => ({ brawler: b, score: score(t, b.vector), axes: matchingAxes(t, b.vector) }))
    .sort((a, b) => b.score - a.score)

  if (!ownedTrophies || ownedTrophies.size === 0) {
    return { familiar: [], fresh: [], single: ranked.slice(0, SINGLE_LIST_SIZE) }
  }

  // 내 트로피 중앙값 위/아래로 가른다. 미보유는 아래로 본다
  const values = [...ownedTrophies.values()].sort((a, b) => a - b)
  const median = values[Math.floor(values.length / 2)]
  const familiar: Scored[] = []
  const fresh: Scored[] = []
  for (const s of ranked) {
    const mine = ownedTrophies.get(s.brawler.id) ?? 0
    const bucket = mine >= median ? familiar : fresh
    if (bucket.length < GROUP_SIZE) bucket.push(s)
    if (familiar.length === GROUP_SIZE && fresh.length === GROUP_SIZE) break
  }
  return { familiar, fresh, single: [] }
}
