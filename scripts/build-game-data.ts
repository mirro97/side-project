import fs from 'node:fs/promises'
import path from 'node:path'
import { TID_OVERRIDES, NAME_KO_FALLBACK } from '../src/data/name-overrides'
import { createPlaceholderResolver, type GameTables, type Table } from './placeholder-resolver'

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

export function stripGameMarkup(text: string): string {
  return text.replace(COLOR_TAG, '')
}

/**
 * 게임이 스케일링한 뒤에 채우는 수치 자리. 한국어는 <VALUE1>, 영문은 리터럴 x 다.
 *
 * 카드 행의 Value 를 그대로 넣으면 틀린 값이 나온다. 같은 필드에 원값·틱·밀리초가
 * 섞여 있고 토큰은 어느 쪽인지 알려주지 않는다.
 *   브록 "로켓 수가 <VALUE1>% 늘어납니다"  Value=2050   → "2050%"
 *   쉘리 "<VALUE3>초마다"                 Value3=15000 → 실제로는 15초
 *
 * 그래서 숫자를 추측하는 대신 "일정 비율" 같은 표현으로 바꾼다.
 * 수치는 잃지만 능력이 무엇을 하는지는 그대로 전달된다.
 */
const PARTICLE_PAIRS: readonly (readonly [string, string])[] = [
  ['을', '를'],
  ['이', '가'],
  ['은', '는'],
  ['과', '와'],
]
const JOSA_ALT = PARTICLE_PAIRS.flat().join('|')

interface SoftenRule {
  pattern: RegExp
  word: string
  /** 치환어가 받침으로 끝나는가. 뒤따르는 조사를 고르는 기준이다 */
  batchim: boolean
}

/**
 * 토큰과 그 뒤의 단위를 한 단어로 바꾸고, 조사가 붙어 있으면 받침에 맞춰 함께 고친다.
 *
 * 조사 교정을 문장 전체에 걸면 안 된다. "갇혀있는 동안" 의 '는' 은 조사가 아니라
 * 어미인데 '은' 으로 바뀌어 멀쩡한 문장이 깨진다. 내가 바꾼 자리만 손댄다.
 */
/**
 * 끝내 값을 알 수 없는 수치 자리. 두 문법 모두 같은 자리를 뜻한다.
 *   <VALUE1>              스케일링 후 게임이 채우는 자리
 *   <!card.…경로>          참조를 따라가야 하는데 CSV 에 없는 자리
 */
const UNRESOLVED_TOKEN = '(?:<VALUE\\d?>|<![^>]+>)'

function softenRule(unit: string, word: string, batchim: boolean): SoftenRule {
  // 공백은 뒤에 단위나 조사가 실제로 붙어 있을 때만 흡수한다.
  // 무조건 삼키면 "일정 시간동안", "일정량증가" 처럼 뒷 단어와 붙어버린다
  const body = unit ? `\\s*(?:${unit})` : ''
  // 조사는 뒤가 끝나야 조사다. 경계를 안 보면 "% 이하로" 의 '이' 를 조사로 먹어
  // "일정 비율이하로" 가 된다
  const josa = `(?:\\s*(${JOSA_ALT})(?=[\\s.,!?)\\]]|$))?`
  return {
    pattern: new RegExp(`${UNRESOLVED_TOKEN}${body}${josa}`, 'gi'),
    word,
    batchim,
  }
}

const KO_RULES: SoftenRule[] = [
  softenRule('%', '일정 비율', true), // 율 — 받침 ㄹ
  softenRule('초간', '일정 시간 동안', true), // '3초간' — 아래 '초' 규칙보다 먼저 걸러야 한다
  softenRule('초', '일정 시간', true), // 간 — 받침 ㄴ
  softenRule('개|마리|번|회', '일정 수', false), // 수 — 받침 없음
  softenRule('HP', '일정량의 HP', false), // HP — '피', 받침 없음
  softenRule('', '일정량', true), // 량 — 받침 ㅇ
]

/**
 * 치환어에 붙여 써도 되는 조사·접미사.
 * 원문에서 토큰 뒤에 바로 붙어 오는 한글은 이 목록이거나 일반 단어 둘 중 하나였다.
 * 일반 단어면 띄어 써야 한다 — "일정량피해를" 이 아니라 "일정량 피해를".
 */
const ATTACHABLE = /^(?:만큼|마다|씩|의|이|가|을|를|은|는|과|와|에|로|으로|당|째)/

/** 치환어와 뒷 단어가 붙어버리지 않게 띄운다 */
const GLUED = /(일정 비율|일정 시간|일정 수|일정량)([가-힣]+)/g

export function softenKorean(text: string): string {
  let out = text
  for (const { pattern, word, batchim } of KO_RULES) {
    out = out.replace(pattern, (_m, josa?: string) => {
      if (!josa) return word
      const pair = PARTICLE_PAIRS.find(([withB, withoutB]) => josa === withB || josa === withoutB)
      return pair ? word + (batchim ? pair[0] : pair[1]) : word + josa
    })
  }
  return out.replace(GLUED, (_m, word: string, rest: string) =>
    ATTACHABLE.test(rest) ? word + rest : `${word} ${rest}`,
  )
}

const EN_RULES: readonly (readonly [RegExp, string])[] = [
  // BrawlAPI 영문에도 한국어와 같은 토큰이 섞여 들어온다
  [/\b(?:an?|the)\s+(?:<VALUE\d?>|<![^>]+>)\s*%/gi, 'a percentage'],
  [/(?:<VALUE\d?>|<![^>]+>)\s*sec(?:onds?)?\b/gi, 'a short time'],
  [/(?:<VALUE\d?>|<![^>]+>)\s*%/gi, 'a percentage'],
  [/\b(?:an?|the)\s+(?:<VALUE\d?>|<![^>]+>)/gi, 'some'],
  [/(?:<VALUE\d?>|<![^>]+>)/gi, 'some'],
  // 앞의 관사까지 함께 흡수한다. 안 그러면 "an a percentage" 가 된다
  [/\b(?:an?|the)\s+(?<![A-Za-z])x\s*%/g, 'a percentage'],
  [/\b(?:an?|the)\s+(?<![A-Za-z])x\b/g, 'some'],
  [/(?<![A-Za-z])x\s*%/g, 'a percentage'],
  [/(?<![A-Za-z])x\s*sec(?:onds?)?\b/g, 'a short time'],
  [/(?<![A-Za-z])x(?![A-Za-z])/g, 'some'],
  [/\bEvery\s+a short time\b/g, 'Periodically'],
  [/\bevery\s+a short time\b/g, 'periodically'],
]

export function softenEnglish(text: string): string {
  let out = text
  for (const [pattern, word] of EN_RULES) out = out.replace(pattern, word)
  return out.replace(/\ba\s+([aeiouAEIOU])/g, 'an $1')
}

/**
 * 능력 설명을 표시 가능한 문장으로 만든다.
 *
 * 치환자를 세 종류로 나눠 다르게 다룬다.
 *   1. 변환이 이름에 명시된 것(<!card.value1.ticksasseconds>)은 값을 채운다
 *   2. 게임 객체를 따라가야 하는 것(<!card.accessory.skill...>)이 남으면 포기한다
 *   3. 스케일링을 알 수 없는 수치 자리(<VALUE1>, 영문 x)는 자연어로 바꾼다
 *
 * 2번을 포기하는 이유는 그 자리를 지우면 "속도를 늦추고 의 피해를 줍니다" 처럼
 * 조사가 붕 떠서 문장이 깨지기 때문이다. 3번은 단위가 문장에 함께 있어
 * 단위째로 바꾸면 문장이 자연스럽게 유지된다.
 */
export function buildDescription(
  text: string | undefined | null,
  row: Record<string, unknown>,
  locale: 'en' | 'ko',
  /** 치환자 경로를 실제 수치로 바꾼다. 못 푸는 자리는 null 을 준다 */
  resolve: (expr: string, row: Record<string, unknown>) => string | null,
): string | null {
  if (!text) return null
  // 풀지 못한 치환자는 지우지 않고 그대로 남긴다.
  // 지우면 "속도를 늦추고 의 피해를 줍니다" 처럼 조사가 붕 뜨는데,
  // 남겨두면 아래 자연어 치환이 단위째로 받아 문장을 살린다
  const filled = text.replace(
    PLACEHOLDER,
    (whole, expr: string) => resolve(expr, row) ?? whole,
  )
  // 색상 태그가 토큰과 단위 사이에 끼는 경우가 있어 치환보다 먼저 벗긴다
  const plain = stripGameMarkup(filled)
  const soft = locale === 'ko' ? softenKorean(plain) : softenEnglish(plain)
  return soft.replace(/\s+/g, ' ').trim() || null
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

  /** 치환자 경로가 참조하는 CSV. 이게 없으면 능력 설명의 수치를 풀 수 없다 */
  const csv = (name: string) => getJson<Table>(`${BAPI}/game/csv_logic/${name}`)

  const [
    official,
    bapi,
    chars,
    skills,
    kr,
    rotation,
    cards,
    gearBoosts,
    traits,
    statusEffects,
    accessories,
    projectiles,
    areaEffects,
    items,
    actions,
    components,
  ] = await Promise.all([
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
    // 아래는 전부 능력 설명의 치환자를 따라가는 데만 쓴다
    csv('traits'),
    csv('status_effects_logic'),
    csv('accessories'),
    csv('projectiles_logic'),
    csv('area_effects_logic'), // 수치는 area_effects 가 아니라 이쪽에 있다
    csv('items'),
    csv('character_actions'),
    csv('character_components_logic'),
  ])

  const resolveDeep = createPlaceholderResolver({
    cards: cards as Table,
    characters: chars as Table,
    skills: skills as Table,
    traits,
    statusEffects,
    accessories,
    projectiles,
    areaEffects,
    items,
    actions,
    components,
  } satisfies GameTables)

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
    const en = buildDescription(bapiAbility?.description, row ?? {}, 'en', resolveDeep)
    const ko = buildDescription(loc(tid, '_DESC'), row ?? {}, 'ko', resolveDeep)
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
