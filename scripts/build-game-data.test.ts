import { describe, it, expect } from 'vitest'
import {
  toTid,
  normalize,
  buildVector,
  fixHex,
  modeImageId,
  resolveRange,
  stripGameMarkup,
  buildDescription,
  softenEnglish,
  softenKorean,
  type Range,
} from './build-game-data'

/**
 * 카드 행 안에서 끝나는 경로만 푸는 최소 리졸버.
 * 참조를 따라가는 전체 동작은 placeholder-resolver.test 가 덮는다.
 */
const resolve = (expr: string, row: Record<string, unknown>): string | null => {
  const m = /^card\.value(\d?)(?:\.(ticksAsSeconds))?$/i.exec(expr)
  if (!m) return null
  const raw = row[m[1] === '' || m[1] === '1' ? 'Value' : `Value${m[1]}`]
  if (typeof raw !== 'number') return null
  return String(m[2] ? raw / 20 : raw)
}

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

describe("buildDescription", () => {
  it("플레이스홀더가 없으면 색상만 벗겨 돌려준다", () => {
    expect(buildDescription("적을 <c00cc00>느리게</c> 만듭니다.", {}, "ko", resolve)).toBe("적을 느리게 만듭니다.")
  })
  it("단순 값은 치환한다", () => {
    expect(
      buildDescription("<c00cc00><!card.value1.ticksasseconds></c>초 동안 느려집니다.", { Value: 40 }, "ko", resolve),
    ).toBe("2초 동안 느려집니다.")
  })
  it("풀 수 없는 플레이스홀더도 단위째로 자연어가 된다", () => {
    // 지우면 "의 피해를 줍니다" 처럼 조사가 붕 뜬다. 자리를 채워야 문장이 산다
    expect(
      buildDescription("<!card.accessory.skill.damage.scaleToLevel>의 피해를 줍니다.", {}, "ko", resolve),
    ).toBe("일정량의 피해를 줍니다.")
    expect(
      buildDescription("<!card.trait.statusEffect.speedBoostPercent>% 빨라집니다.", {}, "ko", resolve),
    ).toBe("일정 비율 빨라집니다.")
  })
  it("리졸버를 주면 깊은 경로도 실제 수치로 채운다", () => {
    const deep = (expr: string) =>
      expr === "card.trait.statusEffect.speedBoostPercent" ? "13" : null
    expect(
      buildDescription("이동 속도가 <!card.trait.statusEffect.speedBoostPercent>% 증가합니다.", {}, "ko", deep),
    ).toBe("이동 속도가 13% 증가합니다.")
  })
  it("빈 문자열은 null 이다", () => {
    expect(buildDescription("", {}, "ko", resolve)).toBeNull()
    expect(buildDescription(undefined, {}, "ko", resolve)).toBeNull()
  })
})

describe("softenKorean", () => {
  it("<VALUE1> 의 실제 수치는 알 수 없으므로 단위째로 자연어로 바꾼다", () => {
    // 브록: Value=2050 을 그대로 넣으면 "2050% 늘어납니다" 가 된다
    expect(buildDescription("로켓의 수가 <VALUE1>% 늘어납니다.", { Value: 2050 }, "ko", resolve)).toBe(
      "로켓의 수가 일정 비율 늘어납니다.",
    )
  })
  it("단위마다 다른 표현을 쓴다", () => {
    expect(softenKorean("<VALUE1>초 동안")).toBe("일정 시간 동안")
    expect(softenKorean("적 <VALUE1>마리를")).toBe("적 일정 수를")
    expect(softenKorean("<VALUE1>HP 회복")).toBe("일정량의 HP 회복")
    expect(softenKorean("피해량 <VALUE2> 증가")).toBe("피해량 일정량 증가")
  })
  it("치환어에 붙는 조사를 받침에 맞춰 고친다", () => {
    expect(softenKorean("<VALUE1>%가 오른다")).toBe("일정 비율이 오른다")
    expect(softenKorean("적 <VALUE1>개가")).toBe("적 일정 수가")
  })
  it("조사처럼 생긴 단어의 첫 글자를 조사로 먹지 않는다", () => {
    // 쉘리 밴드에이드: '이하로' 의 '이' 는 조사가 아니다
    expect(softenKorean("HP가 <VALUE1>% 이하로 떨어지면")).toBe("HP가 일정 비율 이하로 떨어지면")
    expect(softenKorean("<VALUE1>개 이상 남으면")).toBe("일정 수 이상 남으면")
  })
  it("조사가 없으면 공백을 삼키지 않는다", () => {
    // "일정 시간동안" 처럼 붙어버리면 안 된다
    expect(softenKorean("<VALUE1>초 동안 <VALUE2>% 증가")).toBe("일정 시간 동안 일정 비율 증가")
  })
  it("'초간' 은 '초' 규칙에 걸려 '일정 시간간' 이 되지 않는다", () => {
    expect(softenKorean("<VALUE1>초간 적을 기절시킵니다.")).toBe("일정 시간 동안 적을 기절시킵니다.")
  })
  it("치환어가 뒷 단어와 붙지 않게 띄운다", () => {
    expect(softenKorean("폭발해 주위에 <VALUE2>피해를 줍니다.")).toBe("폭발해 주위에 일정량 피해를 줍니다.")
  })
  it("조사·접미사는 붙여 쓴다", () => {
    expect(softenKorean("HP를 <VALUE2>만큼 회복합니다.")).toBe("HP를 일정량만큼 회복합니다.")
    expect(softenKorean("<VALUE3>초마다")).toBe("일정 시간마다")
    expect(softenKorean("공격당 <VALUE1>%씩")).toBe("공격당 일정 비율씩")
  })
  it("치환하지 않은 자리의 어미는 건드리지 않는다", () => {
    // '는' 은 조사가 아니라 어미다. 전역 조사 교정을 걸면 '은' 으로 깨진다
    expect(softenKorean("갇혀있는 동안 <VALUE1>%의 HP를 잃습니다.")).toBe(
      "갇혀있는 동안 일정 비율의 HP를 잃습니다.",
    )
  })
})

describe("softenEnglish", () => {
  it("리터럴 x 를 자연어로 바꾼다", () => {
    expect(buildDescription("increased by x%.", {}, "en", resolve)).toBe("increased by a percentage.")
    expect(buildDescription("recharges in x sec.", {}, "en", resolve)).toBe("recharges in a short time.")
  })
  it("앞의 관사까지 흡수해 중복 관사를 막는다", () => {
    expect(softenEnglish("gains an x% shield")).toBe("gains a percentage shield")
  })
  it("영문에 섞여 오는 <VALUE> 토큰도 바꾼다", () => {
    expect(softenEnglish("damage taken is reduced by <VALUE>")).toBe("damage taken is reduced by some")
    expect(softenEnglish("they recover <VALUE>% of their max health")).toBe(
      "they recover a percentage of their max health",
    )
  })
  it("정상 단어의 x 는 오탐하지 않는다", () => {
    expect(buildDescription("Max health increases.", {}, "en", resolve)).toBe("Max health increases.")
  })
})

describe("buildDescription — 이름에 변환이 명시된 치환자", () => {
  it("틱→초 변환은 살린다", () => {
    expect(
      buildDescription("<!card.value1.ticksasseconds>초 동안 느려집니다.", { Value: 40 }, "ko", resolve),
    ).toBe("2초 동안 느려집니다.")
  })
})
