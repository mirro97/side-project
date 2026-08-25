import { describe, it, expect } from 'vitest'
import { toTid, normalize, buildVector, fixHex, modeImageId, resolveRange, type Range } from './build-game-data'

describe('toTid', () => {
  it('파스칼 코드명을 TID로 바꾼다', () => {
    expect(toTid('ShotgunGirl')).toBe('TID_SHOTGUN_GIRL')
    expect(toTid('BullDude')).toBe('TID_BULL_DUDE')
  })
})

describe('normalize', () => {
  it('범위 안에서 0~1로 맞춘다', () => {
    expect(normalize(2000, [2000, 6800])).toBe(0)
    expect(normalize(6800, [2000, 6800])).toBe(1)
  })
  it('범위 밖 값을 잘라낸다', () => {
    expect(normalize(100, [2000, 6800])).toBe(0)
  })
})

describe('buildVector', () => {
  const ranges = { hp: [2000, 6800] as Range, speed: [540, 820] as Range, range: [6, 30] as Range }
  it('물몸 근접이 risk 최대에 가깝다', () => {
    expect(buildVector({ hp: 2000, speed: 700, range: 6 }, ranges).risk).toBeCloseTo(1, 5)
  })
  it('고체력 원거리가 risk 최소에 가깝다', () => {
    expect(buildVector({ hp: 6800, speed: 700, range: 30 }, ranges).risk).toBeCloseTo(0, 5)
  })
})

describe('fixHex', () => {
  it('정상 hex는 그대로 둔다', () => {
    expect(fixHex('#fe5e72')).toBe('#fe5e72')
  })
  it('깨진 hex를 잘라낸다', () => {
    // 게임 원본에 Legendary가 "#fff11ev" 로 들어있다
    expect(fixHex('#fff11ev')).toBe('#fff11e')
  })
  it('복구 불가면 null을 준다', () => {
    expect(fixHex('zzz')).toBeNull()
  })
})

describe('modeImageId', () => {
  it('48000000 오프셋을 더한다', () => {
    expect(modeImageId(5)).toBe(48000005)
    expect(modeImageId(0)).toBe(48000000)
  })
})

describe('resolveRange', () => {
  it('양수는 그대로 쓴다', () => {
    expect(resolveRange(23)).toBe(23)
  })
  it('0 을 결측으로 본다', () => {
    // CastingRange 가 0 인 브롤러가 실제로 있다 (BOLT).
    // nullish 병합만 쓰면 0 이 통과해 "최근접"으로 잘못 정규화된다
    expect(resolveRange(0)).toBeNull()
  })
  it('undefined 와 숫자가 아닌 값도 결측으로 본다', () => {
    expect(resolveRange(undefined)).toBeNull()
    expect(resolveRange('23')).toBeNull()
  })
})
