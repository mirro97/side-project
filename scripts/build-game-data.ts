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

/** BrawlAPI 게임모드 이미지 ID = 48000000 + 공식 modeId */
export function modeImageId(modeId: number): number {
  return 48000000 + modeId
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

  const [official, bapi, chars, skills, kr, rotation] = await Promise.all([
    getJson<{ items: any[] }>(`${PROXY}/brawlers`, token),
    getJson<{ list: any[] }>(`${BAPI}/v1/brawlers`),
    getJson<Record<string, any>>(`${BAPI}/game/csv_logic/characters`),
    getJson<Record<string, any>>(`${BAPI}/game/csv_logic/skills`),
    getJson<Record<string, { KR: string }>>(`${BAPI}/game/localization/kr`),
    getJson<any[]>(`${PROXY}/events/rotation`, token),
  ])

  // 존재 여부의 기준은 공식 API 다. BrawlAPI 에만 있는 브롤러는 버린다
  const officialIds = new Set(official.items.map(b => b.id))
  const bapiById = new Map(bapi.list.map(b => [b.id, b]))
  const charById = new Map(
    Object.entries(chars)
      .filter(([, r]) => officialIds.has(r.id))
      .map(([code, r]) => [r.id as number, { code, row: r }]),
  )

  const warn: string[] = []
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
      stats: { hp: (c?.row.Hitpoints ?? 0) as number, speed: (c?.row.Speed ?? 0) as number, range },
      images: {
        portrait: `https://cdn.brawlify.com/brawlers/borderless/${o.id}.png`,
        emoji: `https://cdn.brawlify.com/brawlers/emoji/${o.id}.png`,
      },
      starPowers: (o.starPowers ?? []).map((x: any) => ({ id: x.id, name: x.name })),
      gadgets: (o.gadgets ?? []).map((x: any) => ({ id: x.id, name: x.name })),
      gears: (o.gears ?? []).map((g: any) => ({ id: g.id, name: g.name })),
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
    modeId: e.modeId as number,
    imageId: modeImageId(e.modeId),
    apiKey: e.mode as string,
    name: { en: e.mode as string, ko: kr[`TID_GAME_MODE_${e.modeId}`]?.KR ?? (e.mode as string) },
  }))

  const out = { version: new Date().toISOString(), brawlers, modes, ranges }
  const file = path.join('src', 'data', 'game-data.generated.json')
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(out, null, 2))

  console.log(`브롤러 ${brawlers.length}종, 모드 ${modes.length}종 생성`)
  console.log(`정규화 기준 hp ${ranges.hp} / speed ${ranges.speed} / range ${ranges.range}`)
  // 빌드를 실패시키지 않는다. 신규 브롤러가 나올 때마다 배포가 막히면 안 된다
  if (warn.length) console.warn(`\n경고 ${warn.length}건\n` + warn.map(w => '  ' + w).join('\n'))
}

if (process.argv[1]?.endsWith('build-game-data.ts')) void main()
