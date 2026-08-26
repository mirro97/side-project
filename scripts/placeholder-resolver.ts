/**
 * 능력 설명의 깊은 치환자를 게임 CSV 참조를 따라가 푼다.
 *
 * <!card.trait.statusEffect.speedBoostPercent> 같은 경로는 한 테이블에서
 * 끝나지 않고 다른 CSV 로 이어진다.
 *
 *   cards["Gunslinger_unique"].Traits    = "ColtSpeedSp"
 *   traits["ColtSpeedSp"].StatusEffect   = "GunslingerStarPowerMovementSpeed"
 *   status_effects[…].SpeedBoostPercent  = 13   ← 최종 수치
 *
 * 검증: card.character.maxHealth 를 106종 전부 풀어 이미 확정된 stats.hp 와
 * 대조했을 때 106/106 일치했다. 참조를 제대로 따라간다는 근거다.
 */

export type Row = Record<string, unknown>
export type Table = Record<string, unknown>

/** 리졸버가 참조하는 CSV 들. 이름은 BrawlAPI 의 csv_logic 파일명을 따른다 */
export interface GameTables {
  accessories: Table
  skills: Table
  traits: Table
  statusEffects: Table
  projectiles: Table
  characters: Table
  areaEffects: Table
  items: Table
  actions: Table
  components: Table
  cards: Table
}

/**
 * 치환자 세그먼트 이름과 실제 CSV 컬럼명이 다른 것들.
 * 전부 실물 행을 덤프해 확인했다 — 추측한 매핑은 없다.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  accessory: ['Accessory', 'Skill', 'Name'],
  character: ['Character', 'Target', 'SummonedCharacter'],
  summonedcharacter: ['SummonedCharacter', 'SpawnedCharacter'],
  trait: ['Traits', 'Trait'],
  projectile: ['Projectile', 'Projectiles'],
  component: ['Components', 'Component', 'CharacterComponents'],
  weaponskill: ['WeaponSkill'],
  skill: ['Skill', 'Skills'],
  value1: ['Value', 'Value1', 'CustomValue1'],
  value2: ['Value2', 'CustomValue2'],
  value3: ['Value3'],
  value: ['Value'],
  values: ['Values'],
  maxhealth: ['Hitpoints'],
  duration: ['DurationTicks', 'Duration'],
  activetime: ['ActiveTicks', 'ActiveTime'],
  customvalue1: ['CustomValue1', 'CustomValue'],
  customvalue2: ['CustomValue2'],
  maxammo: ['MaxCharge'], // 쉘리 집중 사격 = 3회
  timems: ['TimeMs', 'PreExplosionTimeMs'],
  areaeffect: ['AreaEffectObject', 'AreaEffect', 'AreaEffects'],
  areaeffectobject2: ['AreaEffectObject2'],
  customobjectitem: ['CustomObject'],
  customobjectprojectile: ['CustomObject'],
  triggerareaeffect: ['TriggerAreaEffect', 'AreaEffect', 'AreaEffects'],
  activationselfstatuseffect: ['ActivationSelfStatusEffects'],
  // 투사체는 상태이상을 액션 테이블을 거쳐 참조한다
  statuseffectenemy: ['StatusEffectEnemy', 'OnEnemyHitActions'],
  statuseffectally: ['StatusEffectAlly', 'OnAllyHitActions'],
  statuseffectself: ['StatusEffectSelf'],
  // 대상이 명시되지 않은 statusEffect 는 행에 실제로 있는 컬럼을 쓴다
  statuseffect: [
    'StatusEffect',
    'StatusEffects',
    'StatusEffectEnemy',
    'StatusEffectAlly',
    'StatusEffectSelf',
  ],
}

/** 세그먼트로 도달한 문자열을 어느 테이블에서 찾을지 */
const LOOKUP: Record<string, keyof GameTables> = {
  accessory: 'accessories',
  skill: 'skills',
  weaponskill: 'skills',
  trait: 'traits',
  character: 'characters',
  summonedcharacter: 'characters',
  projectile: 'projectiles',
  areaeffect: 'areaEffects',
  areaeffectobject2: 'areaEffects',
  spawnareaeffectobject: 'areaEffects',
  triggerareaeffect: 'areaEffects',
  customobjectitem: 'items',
  customobjectprojectile: 'projectiles',
  spawneditem: 'items',
  statuseffect: 'statusEffects',
  statuseffectenemy: 'statusEffects',
  statuseffectally: 'statusEffects',
  statuseffectself: 'statusEffects',
  component: 'components',
}

/** 행에 컬럼으로 없고 계산해야 하는 값 */
const COMPUTED: Record<string, (row: Row) => number | null> = {
  // 안쪽 반경 피해 = 기본 피해 × 안쪽 배율 (에드거 하드 랜딩 138 → 276)
  innerradiusdamage: row => {
    const dmg = row.Damage
    const pct = row.InnerRadiusDamagePercent
    return typeof dmg === 'number' && typeof pct === 'number' ? (dmg * pct) / 100 : null
  },
}

/**
 * 변환 지시. 값을 바꾸지 않고 통과시키는 것도 있다.
 * scaleToLevel 은 레벨 1 기준값을 뜻한다 — HP·사거리와 같은 기준이라 그대로 둔다.
 */
const MODIFIERS = new Set([
  'ticksasseconds',
  'msassec',
  'msasseconds',
  'scaletolevel',
  'scalestattolevel',
])
const SCALE_PREFIX = [
  'scaleaccessoryvalue',
  'scalecardvalue',
  'scaleweapondamagelevel',
  'scaleby',
]

const INDEXED = /^([a-z0-9_]+)\[(\d+)\]$/

function isRow(v: unknown): v is Row {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 행에서 세그먼트에 해당하는 필드를 찾는다 (대소문자·별칭·복수형 허용) */
function field(row: unknown, name: string): unknown {
  if (!isRow(row)) return null
  const computed = COMPUTED[name]?.(row)
  if (computed !== null && computed !== undefined) return computed
  for (const cand of [...(FIELD_ALIASES[name] ?? []), name, `${name}s`]) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === cand.toLowerCase()) {
        const v = row[key]
        if (v !== null && v !== undefined && v !== '') return v
      }
    }
  }
  return null
}

export function createPlaceholderResolver(tables: GameTables) {
  const all = Object.values(tables)

  /** 문자열이면 참조로 보고 테이블에서 행을 찾는다 */
  function deref(value: unknown, seg: string): unknown {
    if (typeof value !== 'string') return value
    let val = value
    if (val.includes(';')) {
      // 'A;B' 는 참조 목록이다. 첫 번째만 따라간다
      const first = val.split(';')[0]
      if (all.some(t => first in t)) val = first
    }
    const named = LOOKUP[seg]
    if (named && val in tables[named]) return tables[named][val]
    if (val in tables.actions) {
      // 투사체·범위효과 → 액션 → 상태이상 으로 한 단계 더 들어간다
      const action = tables.actions[val]
      const se = isRow(action) ? action.StatusEffects : null
      if (typeof se === 'string') {
        const head = se.split(';')[0]
        if (head in tables.statusEffects) return tables.statusEffects[head]
      }
      return action
    }
    for (const t of all) {
      if (val in t && isRow(t[val])) return t[val]
    }
    return val
  }

  /** 치환자 경로를 따라가 최종 수치를 구한다. 못 풀면 null */
  return function resolve(expr: string, cardRow: Row): string | null {
    const segs = expr.toLowerCase().split('.')
    // <!arcade.largerAreaUlti.…> 처럼 카드에서 출발하지 않는 경로는 풀 수 없다
    if (segs[0] !== 'card') return null

    let cur: unknown = cardRow
    let ticks = false
    let ms = false

    for (let seg of segs.slice(1)) {
      const m = INDEXED.exec(seg)
      const idx = m ? Number(m[2]) : null
      if (m) seg = m[1]

      if (MODIFIERS.has(seg) || SCALE_PREFIX.some(p => seg.startsWith(p))) {
        ticks ||= seg === 'ticksasseconds'
        ms ||= seg === 'msassec' || seg === 'msasseconds'
        continue
      }

      let val = field(cur, seg)
      if (val === null) return null
      // 다중 값 컬럼은 JSON 배열로 온다 (Values = [40, 10, 35, 60])
      if (Array.isArray(val)) {
        val = idx !== null ? (val[idx] ?? null) : val.length === 1 ? val[0] : null
      } else if (idx !== null && typeof val === 'string' && val.includes(',')) {
        val = val.split(',')[idx] ?? null
      }
      if (val === null) return null
      cur = deref(val, seg)
    }

    let num: number
    if (typeof cur === 'string') {
      // 'Value' 에 '33;100' 처럼 여러 값이 들어 있으면 첫 값이 표시용이다
      num = Number(cur.split(';')[0].split(',')[0])
      if (Number.isNaN(num)) return null
    } else if (typeof cur === 'number') {
      num = cur
    } else {
      return null
    }

    if (ticks) num = Math.round((num / 20) * 10) / 10 // 게임은 1초를 20틱으로 센다
    if (ms) num = Math.round((num / 1000) * 10) / 10
    return String(num)
  }
}
