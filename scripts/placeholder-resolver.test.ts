import { describe, it, expect } from "vitest"
import { createPlaceholderResolver, type GameTables } from "./placeholder-resolver"

/** 실제 CSV 에서 콜트 스피드 부츠 체인을 그대로 축약한 픽스처 */
const TABLES: GameTables = {
  cards: {
    // 트레잇형 스타파워 — 카드가 Traits 로 연결된다
    Gunslinger_unique: { id: 23000077, Name: "Gunslinger_unique", Target: "Gunslinger", Traits: "ColtSpeedSp" },
    // 가젯 — 카드의 Skill 이 accessories 행 이름을 가리킨다
    Gunslinger_Reload: { id: 23000078, Name: "Gunslinger_Reload", Target: "Gunslinger", Skill: "Colt_Reload" },
  },
  traits: {
    ColtSpeedSp: { Name: "ColtSpeedSp", StatusEffect: "GunslingerStarPowerMovementSpeed" },
  },
  statusEffects: {
    GunslingerStarPowerMovementSpeed: { Name: "…", SpeedBoostPercent: 13, DurationTicks: 40 },
    ShieldEffect: { Name: "ShieldEffect", ActionsOnCancelOnDamage: "GiveAmmo" },
  },
  characters: {
    Gunslinger: { Name: "Gunslinger", Hitpoints: 3100, Components: "ColtComponent" },
  },
  components: {
    ColtComponent: { Name: "ColtComponent", Values: [40, 10, 35, 60] },
  },
  accessories: {
    Colt_Reload: { Name: "Colt_Reload", Skill: "ColtReloadSkill", CustomObject: "TrapItem" },
  },
  skills: {
    ColtReloadSkill: { Name: "ColtReloadSkill", Damage: 320, MaxCharge: 3, AreaEffectObject: "ColtArea" },
  },
  areaEffects: {
    ColtArea: { Name: "ColtArea", Damage: 138, InnerRadiusDamagePercent: 200, CustomValue: 50 },
  },
  projectiles: {
    P1: { Name: "P1", OnEnemyHitActions: "SlowAction" },
  },
  items: { TrapItem: { Name: "TrapItem", AreaEffect: "ColtArea" } },
  actions: {
    GiveAmmo: { Name: "GiveAmmo", Values: 2 },
    SlowAction: { Name: "SlowAction", StatusEffects: "GunslingerStarPowerMovementSpeed" },
  },
}

const resolve = createPlaceholderResolver(TABLES)
const card = TABLES.cards.Gunslinger_unique as Record<string, unknown>
const gadget = TABLES.cards.Gunslinger_Reload as Record<string, unknown>

describe("createPlaceholderResolver", () => {
  it("여러 CSV 를 건너뛰며 최종 수치까지 따라간다", () => {
    // cards.Traits -> traits.StatusEffect -> status_effects.SpeedBoostPercent
    expect(resolve("card.trait.statusEffect.speedBoostPercent", card)).toBe("13")
  })

  it("틱은 초로 바꾼다 (1초 = 20틱)", () => {
    expect(resolve("card.trait.statusEffect.duration.ticksAsSeconds", card)).toBe("2")
  })

  it("scaleToLevel 은 레벨 1 기준값이라 값을 바꾸지 않는다", () => {
    // 우리 stats.hp 도 같은 기준이다 — 106종 대조로 확인했다
    expect(resolve("card.character.maxHealth", card)).toBe("3100")
    expect(resolve("card.character.maxHealth.scaleToLevel", card)).toBe("3100")
  })

  it("컬럼명이 치환자 이름과 달라도 별칭으로 찾는다", () => {
    expect(resolve("card.accessory.skill.maxAmmo", gadget)).toBe("3") // MaxCharge
    expect(resolve("card.accessory.skill.areaEffect.customValue1", gadget)).toBe("50") // CustomValue
  })

  it("다중 값 컬럼은 배열로 오므로 인덱스로 꺼낸다", () => {
    expect(resolve("card.character.component[0].values[0]", card)).toBe("40")
    expect(resolve("card.character.component[0].values[2]", card)).toBe("35")
  })

  it("행에 없는 값은 계산한다", () => {
    // 안쪽 반경 피해 = 138 x 200%
    expect(resolve("card.accessory.skill.areaEffect.innerRadiusDamage", gadget)).toBe("276")
  })

  it("액션을 거쳐 상태이상까지 한 단계 더 들어간다", () => {
    expect(resolve("card.accessory.customObjectItem.areaEffect.damage", gadget)).toBe("138")
  })

  it("카드에서 출발하지 않는 경로는 풀지 않는다", () => {
    // <!arcade.largerAreaUlti.rangePercent> 는 어느 CSV 에도 없다
    expect(resolve("arcade.largerAreaUlti.rangePercent", card)).toBeNull()
  })

  it("경로가 끊기면 추측하지 않고 null 을 준다", () => {
    expect(resolve("card.accessory.skill.cactusMinionHealing", gadget)).toBeNull()
    expect(resolve("card.trait.statusEffect.nonExistentField", card)).toBeNull()
  })
})
