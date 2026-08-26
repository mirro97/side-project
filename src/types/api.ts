/**
 * 공식 API 가 주는 능력은 { id, name } 뿐이다.
 * 빌드 산출물의 Ability(현지화 이름 + 설명)와 모양이 달라 별도로 둔다.
 */
export interface ApiAbility {
  id: number
  name: string
}

export interface PlayerBrawler {
  id: number; name: string; power: number; rank: number
  trophies: number; highestTrophies: number
  gears: ApiAbility[]; starPowers: ApiAbility[]; gadgets: ApiAbility[]
}

export interface Player {
  tag: string; name: string; nameColor: string
  icon: { id: number }
  trophies: number; highestTrophies: number
  expLevel: number; expPoints: number
  '3vs3Victories': number; soloVictories: number; duoVictories: number
  club?: { tag: string; name: string }
  brawlers: PlayerBrawler[]
}

export interface RankingEntry {
  tag: string; name: string; nameColor: string
  icon: { id: number }; trophies: number; rank: number
  club?: { name: string }
}

export interface ClubRankingEntry {
  tag: string; name: string; badgeId: number
  trophies: number; rank: number; memberCount: number
}

export interface Paged<T> {
  items: T[]
  paging: { cursors: { after?: string; before?: string } }
}

export interface EventSlot {
  startTime: string; endTime: string; slotId: number
  event: { id: number; mode: string; modeId: number; map: string }
}

/** 배틀로그 파서 산출물 — 팀 모드와 쇼다운을 하나로 정규화한다 */
export interface ParsedBattle {
  battleTime: string
  mode: string
  map: string | null
  brawlerId: number | null
  result: 'victory' | 'defeat' | 'draw' | null
  /** 쇼다운 계열 */
  rank: number | null
  trophyChange: number | null
  isStarPlayer: boolean
}
