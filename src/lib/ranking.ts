import type { ClubRankingEntry, Paged, RankingEntry } from '@/types/api'

export const RANKING_KINDS = ['players', 'clubs'] as const
export type RankingKind = (typeof RANKING_KINDS)[number]

/**
 * 공식 API 는 국가 코드를 검증하지 않는다. 없는 코드도 200 에 빈 목록으로 온다
 * (실측: ZZ·XX → items 0개). 에러가 아니라 조용한 빈 화면이라 더 나쁘다.
 * 그래서 목록을 고정하고 그 밖은 라우트 핸들러가 400 으로 막는다.
 */
export const COUNTRIES = [
  'global',
  'KR',
  'US',
  'JP',
  'DE',
  'GB',
  'FR',
  'BR',
  'MX',
  'ES',
] as const
export type Country = (typeof COUNTRIES)[number]

export const DEFAULT_KIND: RankingKind = 'players'
/** 해외 타겟이라 글로벌이 기본이다 */
export const DEFAULT_COUNTRY: Country = 'global'

/** 한 번에 받는 개수. 200위가 상한이라 30씩이면 7페이지에서 끝난다 */
export const PAGE_SIZE = 30

export function isRankingKind(v: string | null | undefined): v is RankingKind {
  return RANKING_KINDS.includes(v as RankingKind)
}

/**
 * API 는 대소문자를 가리지 않지만(kr = KR) 우리는 대문자로 정규화한다.
 * 같은 국가가 캐시 키 두 개로 갈리는 걸 막는다.
 */
export function normalizeCountry(v: string | null | undefined): Country | null {
  if (!v) return null
  const upper = v.toUpperCase()
  const hit = COUNTRIES.find(c => c.toUpperCase() === upper)
  return hit ?? null
}

/** paging.cursors 가 빈 객체로 오는 게 200위 종료 신호다 */
export function nextCursorOf(paged: Paged<unknown>): string | undefined {
  return paged.paging?.cursors?.after || undefined
}

export interface RankRowData {
  tag: string
  rank: number
  name: string
  trophies: number
  iconUrl: string
  subtitle?: string
  nameColor?: string
}

const PROFILE_ICON = 'https://cdn.brawlify.com/profile-icons/regular'
const CLUB_BADGE = 'https://cdn.brawlify.com/club-badges/regular'

/** 클럽 정원은 30명 고정이다 */
const CLUB_CAPACITY = 30

export function toPlayerRow(e: RankingEntry): RankRowData {
  return {
    tag: e.tag,
    rank: e.rank,
    name: e.name,
    trophies: e.trophies,
    iconUrl: `${PROFILE_ICON}/${e.icon.id}.png`,
    subtitle: e.club?.name,
    nameColor: e.nameColor,
  }
}

export function toClubRow(e: ClubRankingEntry): RankRowData {
  return {
    tag: e.tag,
    rank: e.rank,
    name: e.name,
    trophies: e.trophies,
    iconUrl: `${CLUB_BADGE}/${e.badgeId}.png`,
    // 홈 클럽 섹션과 같은 표기를 쓴다
    subtitle: `${e.memberCount}/${CLUB_CAPACITY}`,
  }
}

/** 태그는 # 유무와 대소문자가 섞여 들어온다. 비교 전에 맞춘다 */
export function sameTag(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const bare = (t: string) => (t.startsWith('#') ? t.slice(1) : t).toUpperCase()
  return bare(a) === bare(b)
}
