import { bsFetch, encodeTag } from './client'
import type { ClubRankingEntry, EventSlot, Paged, Player, RankingEntry } from '@/types/api'

/** 랭킹은 국가당 200위가 상한이다. limit 을 아무리 올려도 200 에서 잘린다 */
export function getRankingsPlayersApi(country: string, limit: number, after?: string) {
  const cursor = after ? `&after=${after}` : ''
  return bsFetch<Paged<RankingEntry>>(`/rankings/${country}/players?limit=${limit}${cursor}`)
}

export function getRankingsClubsApi(country: string, limit: number, after?: string) {
  const cursor = after ? `&after=${after}` : ''
  return bsFetch<Paged<ClubRankingEntry>>(`/rankings/${country}/clubs?limit=${limit}${cursor}`)
}

export function getEventsRotationApi() {
  return bsFetch<EventSlot[]>('/events/rotation')
}

export function getPlayerApi(tag: string) {
  return bsFetch<Player>(`/players/${encodeTag(tag)}`)
}

export function getPlayerBattlelogApi(tag: string) {
  return bsFetch<{ items: unknown[] }>(`/players/${encodeTag(tag)}/battlelog`)
}
