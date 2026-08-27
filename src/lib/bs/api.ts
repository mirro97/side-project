import { bsFetch, encodeTag } from './client'
import type { ClubRankingEntry, EventSlot, Paged, Player, RankingEntry } from '@/types/api'

/**
 * 공유 데이터의 캐시 수명. 방문자마다 프록시를 때릴 이유가 없다.
 * 프록시 왕복이 500ms 바닥이라 캐시가 선택이 아니다.
 */
const SHARED_CACHE = { next: { revalidate: 600 } } satisfies RequestInit

/** 랭킹은 국가당 200위가 상한이다. limit 을 아무리 올려도 200 에서 잘린다 */
export function getRankingsPlayersApi(country: string, limit: number, after?: string) {
  const cursor = after ? `&after=${after}` : ''
  return bsFetch<Paged<RankingEntry>>(
    `/rankings/${country}/players?limit=${limit}${cursor}`,
    SHARED_CACHE,
  )
}

export function getRankingsClubsApi(country: string, limit: number, after?: string) {
  const cursor = after ? `&after=${after}` : ''
  return bsFetch<Paged<ClubRankingEntry>>(
    `/rankings/${country}/clubs?limit=${limit}${cursor}`,
    SHARED_CACHE,
  )
}

export function getEventsRotationApi() {
  return bsFetch<EventSlot[]>('/events/rotation', SHARED_CACHE)
}

export function getPlayerApi(tag: string) {
  return bsFetch<Player>(`/players/${encodeTag(tag)}`)
}

/**
 * 최근 전투 25전. 개인 데이터라 캐시하지 않는다.
 * 코드 리뷰 때 호출부가 없어 지웠던 래퍼인데, 프로필이 쓰기 시작해 되살렸다.
 */
export function getPlayerBattlelogApi(tag: string) {
  return bsFetch<Paged<unknown>>(`/players/${encodeTag(tag)}/battlelog`)
}
