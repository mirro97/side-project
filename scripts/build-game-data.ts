import fs from 'node:fs/promises'
import path from 'node:path'
import { TID_OVERRIDES, NAME_KO_FALLBACK } from '../src/data/name-overrides'

export type Range = [number, number]

export function toTid(code: string): string {
  return 'TID_' + code.replace(/(?<!^)(?=[A-Z])/g, '_').toUpperCase()
}

export function normalize(v: number, [lo, hi]: Range): number {
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
}

export function buildVector(
  s: { hp: number; speed: number; range: number },
  r: { hp: Range; speed: Range; range: Range },
) {
  const range = normalize(s.range, r.range)
  const durability = normalize(s.hp, r.hp)
  const mobility = normalize(s.speed, r.speed)
  return { range, durability, mobility, risk: (1 - durability) * (1 - range) }
}

/** 게임 원본 색상값에 잘못된 hex가 섞여 있다 (Legendary 가 "#fff11ev") */
export function fixHex(c: string | undefined | null): string | null {
  if (!c) return null
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c
  const m = c.match(/^#([0-9a-fA-F]{6})/)
  return m ? `#${m[1]}` : null
}

/**
 * CastingRange 를 사거리로 확정한다.
 * 0 으로 들어오는 브롤러가 있어 nullish 병합만으로는 부족하다.
 * 0 이 통과하면 정규화 후 최근접으로 잘못 취급된다.
 */
export function resolveRange(v: unknown): number | null {
  return typeof v === 'number' && v > 0 ? v : null
}

/** 게임 원본 텍스트의 색상 태그. 실측 시 c00cc00(초록)과 ccc0000(빨강) 두 종뿐이었다 */
const COLOR_TAG = /<\/?c[0-9a-fA-F]*>/g

/** 능력 설명에 박혀 있는 값 치환자 */
const PLACEHOLDER = /<!([^>]+)>/g

/** 카드 행에서 바로 풀 수 있는 형태만 매칭한다 */
const SIMPLE_VALUE = /^card\.value(\d?)(?:\.(ticksasseconds|scaletolevel|scalestattolevel))?$/i

export function stripGameMarkup(text: string): string {
  return text.replace(COLOR_TAG, '')
}

/**
 * <!card.value1.ticksasseconds> 같은 단순 치환자만 푼다.
 *
 * 실측 시 424개 능력 설명에 70종이 넘는 치환자가 있었는데, 대부분은
 * card.accessory.skill.projectile... 처럼 게임 내부 객체를 따라가야 해서
 * 엔진 없이는 값을 알 수 없다. 그런 것은 null 을 준다.
 */
export function resolveCardValue(expr: string, row: Record<string, unknown>): string | null {
  const m = SIMPLE_VALUE.exec(expr)
  if (!m) return null
  const idx = m[1]
  const modifier = (m[2] ?? '').toLowerCase()
  const key = idx === '' || idx === '1' ? 'Value' : `Value${idx}`
  const raw = row[key]
  if (typeof raw !== 'number' || raw <= 0) return null
  if (modifier === 'ticksasseconds') {
    // 게임은 1초를 20틱으로 센다
    const sec = Math.round((raw / 20) * 10) / 10
    return String(sec)
  }
  return String(raw)
}

/**
 * 변환이 이름에 없는 치환자. 카드 행의 Value 를 그대로 넣으면 틀린 값이 나온다.
 * 예: 브록 "로켓 수가 <VALUE1>% 늘어납니다" 에서 Value=2050 → "2050%"
 *     쉘리 "<VALUE3>초마다" 에서 Value3=15000 (실제로는 15초)
 * 카드 Value 는 화면 표시값이 아니라 스케일링 전 원본이다.
 */
const OPAQUE_VALUE = /<VALUE\d?>/i

/**
 * BrawlAPI 영문 설명이 수치를 못 채웠을 때 넣는 리터럴 x.
 * 예: "increased by x%", "recharges in x sec"
 */
const LITERAL_X = /(?<![A-Za-z])x(?![A-Za-z])/

/**
 * 능력 설명을 표시 가능한 문장으로 만든다.
 *
 * 신뢰 기준은 "변환이 이름에 명시됐는가"다.
 * <!card.value1.ticksasseconds> 는 틱→초 변환이 이름에 있어 안전하게 풀 수 있지만,
 * <VALUE1> 은 어떤 스케일링을 거치는지 알 수 없어 풀면 틀린 값이 나온다.
 *
 * 하나라도 풀지 못하면 null 을 돌려준다. 수치만 지우면
 * "속도를 늦추고 의 피해를 줍니다" 처럼 조사가 붕 떠서 문장이 깨지기 때문에,
 * 반쪽짜리를 보여주느니 표시하지 않는다.
 */
export function buildDescription(
  text: string | undefined | null,
  row: Record<string, unknown>,
): string | null {
  if (!text) return null
  let unresolved = false
  const filled = text.replace(PLACEHOLDER, (_, expr: string) => {
    const v = resolveCardValue(expr, row)
    if (v === null) unresolved = true
    return v ?? ''
  })
  if (unresolved) return null
  const plain = stripGameMarkup(filled).replace(/\s+/g, ' ').trim()
  if (!plain) return null
  if (OPAQUE_VALUE.test(plain) || LITERAL_X.test(plain)) return null
  return plain
}

/** BrawlAPI 게임모드 이미지 ID = 48000000 + 공식 modeId */
export function modeImageId(modeId: number): number {
  return 48000000 + modeId
}

/** 외부 응답의 최소 형태. 전체를 타이핑하지 않고 쓰는 필드만 선언한다 */
interface Ability { id: number; name: string }
interface OfficialBrawler {
  id: number
  name: string
  starPowers?: Ability[]
  gadgets?: Ability[]
  gears?: Ability[]
}
interface BapiBrawler {
  id: number
  name?: string
  description?: string
  class?: { name?: string }
  rarity?: { id?: number; name?: string; color?: string }
  starPowers?: BapiAbility[]
  gadgets?: BapiAbility[]
}
interface CharacterRow {
  id?: number
  Hitpoints?: number
  Speed?: number
  WeaponSkill?: string
}
interface SkillRow {
  CastingRange?: number
}
interface CardRow {
  id?: number
  TID?: string
  Value?: number
  Value2?: number
  Value3?: number
  // buildDescription 이 Value 필드를 이름으로 찾는다
  [key: string]: unknown
}
interface GearBoostRow {
  id?: number
  TID?: string
  ModifierValue?: number
  ModifierType?: string
}
interface BapiAbility {
  id: number
  name?: string
  description?: string
}
interface RotationItem {
  event: { mode: string; modeId: number }
}

const PROXY = 'https://bsproxy.royaleapi.dev/v1'
const BAPI = 'https://api.brawlapi.com'

const ROLE_MAP: Record<string, string> = {
  'Damage Dealer': 'damage', Tank: 'tank', Assassin: 'assassin',
  Support: 'support', Controller: 'controller',
  Marksman: 'marksman', Artillery: 'artillery',
}

async function getJson<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json() as Promise<T>
}

async function main() {
  const token = process.env.BRAWL_STARS_TOKEN
  if (!token) throw new Error('BRAWL_STARS_TOKEN 이 없습니다')

  const [official, bapi, chars, skills, kr, rotation, cards, gearBoosts] = await Promise.all([
    getJson<{ items: OfficialBrawler[] }>(`${PROXY}/brawlers`, token),
    getJson<{ list: BapiBrawler[] }>(`${BAPI}/v1/brawlers`),
    getJson<Record<string, CharacterRow>>(`${BAPI}/game/csv_logic/characters`),
    getJson<Record<string, SkillRow>>(`${BAPI}/game/csv_logic/skills`),
    getJson<Record<string, { KR: string }>>(`${BAPI}/game/localization/kr`),
    getJson<RotationItem[]>(`${PROXY}/events/rotation`, token),
    // 스타파워·가젯의 TID 와 수치. 공식 API 는 id 와 name 만 준다
    getJson<Record<string, CardRow>>(`${BAPI}/game/csv_logic/cards`),
    // 기어의 TID 와 수치 효과. BrawlAPI 에 /v1/gears 엔드포인트는 없다
    getJson<Record<string, GearBoostRow>>(`${BAPI}/game/csv_logic/gear_boosts`),
  ])

  // 존재 여부의 기준은 공식 API 다. BrawlAPI 에만 있는 브롤러는 버린다
  const officialIds = new Set(official.items.map(b => b.id))
  const bapiById = new Map(bapi.list.map(b => [b.id, b]))
  const charById = new Map(
    Object.entries(chars)
      .filter(([, r]) => r.id !== undefined && officialIds.has(r.id))
      .map(([code, r]) => [r.id as number, { code, row: r }]),
  )

  const cardById = new Map<number, CardRow>()
  for (const row of Object.values(cards)) {
    if (row.id !== undefined) cardById.set(row.id, row)
  }
  const gearById = new Map<number, GearBoostRow>()
  for (const row of Object.values(gearBoosts)) {
    if (row.id !== undefined) gearById.set(row.id, row)
  }

  const warn: string[] = []

  /** 로케일에서 한 줄 꺼낸다 */
  const loc = (tid: string | undefined, suffix = '') =>
    tid ? kr[`${tid}${suffix}`]?.KR : undefined

  /**
   * 스타파워·가젯 하나를 현지화된 형태로 만든다.
   * 영문 이름과 설명은 BrawlAPI, 한글은 cards CSV 의 TID 로 로케일에서 가져온다.
   */
  const buildAbility = (
    a: { id: number; name: string },
    bapiAbility: BapiAbility | undefined,
    label: string,
  ) => {
    const row = cardById.get(a.id)
    const tid = row?.TID
    if (!row) warn.push(`카드 정보 없음: ${label} ${a.name}`)
    const nameEn = bapiAbility?.name ?? a.name
    const nameKo = loc(tid) ?? nameEn
    const en = buildDescription(bapiAbility?.description, row ?? {})
    const ko = buildDescription(loc(tid, '_DESC'), row ?? {})
    return {
      id: a.id,
      name: { en: nameEn, ko: nameKo },
      // 한쪽만 살아남는 경우가 없도록 둘 다 있을 때만 설명을 싣는다
      description: en && ko ? { en, ko } : null,
    }
  }

  const buildGear = (g: { id: number; name: string }) => {
    const row = gearById.get(g.id)
    const nameKo = loc(row?.TID) ?? g.name
    const value = row?.ModifierValue
    const type = row?.ModifierType
    return {
      id: g.id,
      name: { en: g.name, ko: nameKo },
      description: null,
      modifier: typeof value === 'number' && type ? { value, type } : null,
    }
  }
  const raw = official.items.map(o => {
    const c = charById.get(o.id)
    const b = bapiById.get(o.id)
    const tid = c ? (TID_OVERRIDES[c.code] ?? toTid(c.code)) : null
    const t = (suffix = '') => (tid ? kr[`${tid}${suffix}`]?.KR : undefined)

    // 사거리는 AutoAttackRange 가 아니라 WeaponSkill → CastingRange 다.
    const weapon = c?.row.WeaponSkill ? skills[c.row.WeaponSkill] : undefined
    const range = resolveRange(weapon?.CastingRange)
    if (range === null) warn.push(`사거리 없음: ${o.name}`)

    const nameEn: string = b?.name ?? o.name
    const nameKo: string = t() ?? NAME_KO_FALLBACK[o.id] ?? nameEn
    if (!t() && !NAME_KO_FALLBACK[o.id]) warn.push(`한글명 없음: ${o.name}`)

    const roleEn: string | undefined = b?.class?.name
    const role = roleEn && roleEn !== 'Unknown' ? (ROLE_MAP[roleEn] ?? null) : null
    if (!role) warn.push(`역할 없음: ${o.name}`)

    return {
      id: o.id as number,
      name: { en: nameEn, ko: nameKo },
      description: { en: b?.description ?? '', ko: t('_DESC') ?? b?.description ?? '' },
      role,
      rarity: {
        id: b?.rarity?.id ?? 0,
        name: b?.rarity?.name ?? 'Unknown',
        color: fixHex(b?.rarity?.color) ?? '#6B7385',
      },
      stats: { hp: c?.row.Hitpoints ?? 0, speed: c?.row.Speed ?? 0, range },
      images: {
        portrait: `https://cdn.brawlify.com/brawlers/borderless/${o.id}.png`,
        emoji: `https://cdn.brawlify.com/brawlers/emoji/${o.id}.png`,
      },
      starPowers: (o.starPowers ?? []).map(x =>
        buildAbility(x, (b?.starPowers ?? []).find(y => y.id === x.id), o.name),
      ),
      gadgets: (o.gadgets ?? []).map(x =>
        buildAbility(x, (b?.gadgets ?? []).find(y => y.id === x.id), o.name),
      ),
      gears: (o.gears ?? []).map(buildGear),
    }
  })

  // 정규화 기준은 실제 데이터에서 뽑는다. 게임 업데이트로 값이 바뀌어도 따라간다
  const nums = (f: (x: (typeof raw)[number]) => number | null) =>
    raw.map(f).filter((v): v is number => typeof v === 'number' && v > 0)
  const ranges = {
    hp: [Math.min(...nums(b => b.stats.hp)), Math.max(...nums(b => b.stats.hp))] as Range,
    speed: [Math.min(...nums(b => b.stats.speed)), Math.max(...nums(b => b.stats.speed))] as Range,
    range: [Math.min(...nums(b => b.stats.range)), Math.max(...nums(b => b.stats.range))] as Range,
  }

  // 사거리가 없는 브롤러는 같은 역할의 중앙값으로 채운다
  const byRole = new Map<string, number[]>()
  for (const b of raw) {
    if (b.role && b.stats.range) byRole.set(b.role, [...(byRole.get(b.role) ?? []), b.stats.range])
  }
  const median = (a: number[]) =>
    a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null

  const brawlers = raw.map(b => {
    const range =
      b.stats.range ??
      (b.role ? median(byRole.get(b.role) ?? []) : null) ??
      Math.round((ranges.range[0] + ranges.range[1]) / 2)
    return { ...b, vector: buildVector({ hp: b.stats.hp, speed: b.stats.speed, range }, ranges) }
  })

  const modes = [...new Map(rotation.map(e => [e.event.modeId, e.event])).values()].map(e => ({
    modeId: e.modeId,
    imageId: modeImageId(e.modeId),
    apiKey: e.mode,
    name: { en: e.mode, ko: kr[`TID_GAME_MODE_${e.modeId}`]?.KR ?? e.mode },
  }))

  const out = { version: new Date().toISOString(), brawlers, modes, ranges }
  const file = path.join('src', 'data', 'game-data.generated.json')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(out, null, 2))

  const abilities = brawlers.flatMap(b => [...b.starPowers, ...b.gadgets])
  const withDesc = abilities.filter(a => a.description).length
  console.log(`브롤러 ${brawlers.length}종, 모드 ${modes.length}종 생성`)
  console.log(
    `능력 설명 ${withDesc}/${abilities.length} ` +
      `(나머지는 게임 엔진 없이 값을 풀 수 없어 제외)`,
  )
  console.log(`정규화 기준 hp ${ranges.hp} / speed ${ranges.speed} / range ${ranges.range}`)
  // 빌드를 실패시키지 않는다. 신규 브롤러가 나올 때마다 배포가 막히면 안 된다
  if (warn.length) console.warn(`\n경고 ${warn.length}건\n` + warn.map(w => '  ' + w).join('\n'))
}

if (process.argv[1]?.endsWith('build-game-data.ts')) void main()
