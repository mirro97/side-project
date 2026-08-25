import type { Brawler, Locale, RoleKey } from '@/types/game'

export type SortKey = 'released' | 'name' | 'rarity'

export interface BrawlerFilter {
  query?: string
  role?: RoleKey | null
  rarityId?: number | null
}

/**
 * 검색은 현재 UI 언어와 무관하게 영문·한글을 모두 본다.
 * 영어 화면에서 "쉘리"를 쳐도, 한국어 화면에서 "shelly"를 쳐도 잡혀야 한다.
 */
function matchesQuery(b: Brawler, q: string): boolean {
  return b.name.en.toLowerCase().includes(q) || b.name.ko.toLowerCase().includes(q)
}

export function filterBrawlers(list: Brawler[], f: BrawlerFilter): Brawler[] {
  const q = f.query?.trim().toLowerCase() ?? ''
  return list.filter(b => {
    if (q && !matchesQuery(b, q)) return false
    // role 이 null 인 19종은 어떤 역할 필터에도 걸리지 않는다
    if (f.role && b.role !== f.role) return false
    if (f.rarityId != null && b.rarity.id !== f.rarityId) return false
    return true
  })
}

/** 원본을 바꾸지 않는다 */
export function sortBrawlers(list: Brawler[], key: SortKey, locale: Locale): Brawler[] {
  const copy = [...list]
  switch (key) {
    case 'name':
      return copy.sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))
    case 'rarity':
      return copy.sort((a, b) => b.rarity.id - a.rarity.id || a.id - b.id)
    case 'released':
    default:
      // 브롤러 ID 가 출시 순서대로 부여된다. 최신이 위로
      return copy.sort((a, b) => b.id - a.id)
  }
}

export function countByRole(list: Brawler[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const b of list) {
    if (b.role) out[b.role] = (out[b.role] ?? 0) + 1
  }
  return out
}

export function countByRarity(list: Brawler[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const b of list) {
    out[b.rarity.id] = (out[b.rarity.id] ?? 0) + 1
  }
  return out
}
