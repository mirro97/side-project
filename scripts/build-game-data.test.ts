import { describe, it, expect } from 'vitest'
import {
  toTid,
  normalize,
  buildVector,
  fixHex,
  modeImageId,
  resolveRange,
  stripGameMarkup,
  resolveCardValue,
  buildDescription,
  type Range,
} from './build-game-data'

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

describe("stripGameMarkup", () => {
  it("색상 태그를 벗긴다", () => {
    expect(stripGameMarkup("속도가 <c00cc00>15%</c> 증가합니다.")).toBe("속도가 15% 증가합니다.")
  })
  it("닫는 태그만 있어도 처리한다", () => {
    expect(stripGameMarkup("<ccc0000>위험</c>")).toBe("위험")
  })
  it("태그가 없으면 그대로 둔다", () => {
    expect(stripGameMarkup("그냥 문장")).toBe("그냥 문장")
  })
})

describe("resolveCardValue", () => {
  const row = { Value: 30, Value2: 40 }
  const row1 = { Value: 30 }
  it("card.value1 을 Value 로 푼다", () => {
    expect(resolveCardValue("card.value1", row)).toBe("30")
  })
  it("card.value2 를 Value2 로 푼다", () => {
    expect(resolveCardValue("card.value2", row)).toBe("40")
  })
  it("ticksasseconds 는 20 으로 나눈다", () => {
    // 게임은 1초를 20틱으로 센다
    expect(resolveCardValue("card.value1.ticksasseconds", { Value: 40 })).toBe("2")
  })
  it("소수는 한 자리까지 남긴다", () => {
    expect(resolveCardValue("card.value1.ticksasseconds", { Value: 4 })).toBe("0.2")
  })
  it("게임 엔진이 필요한 경로는 풀지 못한다", () => {
    expect(resolveCardValue("card.accessory.skill.damage.scaleToLevel", row)).toBeNull()
  })
  it("값이 없거나 0 이하면 풀지 못한다", () => {
    expect(resolveCardValue("card.value1", { Value: -1 })).toBeNull()
    expect(resolveCardValue("card.value2", row1)).toBeNull()
  })
})

describe("buildDescription", () => {
  it("플레이스홀더가 없으면 색상만 벗겨 돌려준다", () => {
    expect(buildDescription("적을 <c00cc00>느리게</c> 만듭니다.", {})).toBe("적을 느리게 만듭니다.")
  })
  it("단순 값은 치환한다", () => {
    expect(
      buildDescription("<c00cc00><!card.value1.ticksasseconds></c>초 동안 느려집니다.", { Value: 40 }),
    ).toBe("2초 동안 느려집니다.")
  })
  it("풀 수 없는 플레이스홀더가 남으면 null 을 준다", () => {
    // 수치를 지우면 조사가 붕 떠서 한국어가 깨진다. 아예 표시하지 않는다
    expect(buildDescription("<!card.accessory.skill.damage.scaleToLevel>의 피해를 줍니다.", {})).toBeNull()
  })
  it("빈 문자열은 null 이다", () => {
    expect(buildDescription("", {})).toBeNull()
    expect(buildDescription(undefined, {})).toBeNull()
  })
})

describe("buildDescription — 믿을 수 없는 치환자", () => {
  it("<VALUE1> 은 스케일링을 알 수 없어 버린다", () => {
    // 브록: Value=2050 을 그대로 넣으면 "2050% 늘어납니다" 가 된다
    expect(buildDescription("로켓의 수가 <VALUE1>% 늘어납니다.", { Value: 2050 })).toBeNull()
  })
  it("영문의 리터럴 x 도 미치환으로 본다", () => {
    expect(buildDescription("increased by x%.", {})).toBeNull()
    expect(buildDescription("recharges in x sec.", {})).toBeNull()
  })
  it("정상 단어의 x 는 오탐하지 않는다", () => {
    expect(buildDescription("Max health increases.", {})).toBe("Max health increases.")
  })
  it("이름에 변환이 명시된 치환자는 살린다", () => {
    expect(
      buildDescription("<!card.value1.ticksasseconds>초 동안 느려집니다.", { Value: 40 }),
    ).toBe("2초 동안 느려집니다.")
  })
})
