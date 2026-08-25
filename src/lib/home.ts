import { parseBrawlTime } from './bs/parse'
import type { EventSlot, PlayerBrawler } from '@/types/api'

/**
 * 브롤스타즈 API 에 "대표 브롤러" 개념이 없다.
 * 보유 브롤러 중 트로피가 가장 높은 쪽을 대표로 삼는다.
 */
export function pickMainBrawler(brawlers: PlayerBrawler[]): PlayerBrawler | null {
  let best: PlayerBrawler | null = null
  for (const b of brawlers) {
    if (!best || b.trophies > best.trophies) best = b
  }
  return best
}

/**
 * 종료 임박순 정렬. "지금 뭘 해야 하나"에 바로 답이 되는 정렬이다.
 * 파싱 실패나 이미 끝난 슬롯은 제외한다 — API 는 진행 중인 것만 주지만
 * 응답과 렌더 사이에 만료될 수 있다.
 */
export function sortByEndingSoon(slots: EventSlot[], now: Date = new Date()): EventSlot[] {
  return slots
    .map(s => ({ s, end: parseBrawlTime(s.endTime) }))
    .filter((x): x is { s: EventSlot; end: Date } => x.end !== null && x.end > now)
    .sort((a, b) => a.end.getTime() - b.end.getTime())
    .map(x => x.s)
}
