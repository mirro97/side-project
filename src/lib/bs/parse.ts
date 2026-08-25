import type { ParsedBattle } from '@/types/api'

/** 브롤스타즈 API는 20260824T080000.000Z 형태를 쓴다. new Date()로 파싱되지 않는다 */
export function parseBrawlTime(s: string): Date | null {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/)
  if (!m) return null
  const [, y, mo, d, h, mi, sec, ms] = m
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec, +ms))
}

type Participant = { tag: string; brawler?: { id: number } }

interface BattleLogItem {
  battleTime: string
  event?: { mode?: string; map?: string }
  battle?: {
    mode?: string
    result?: ParsedBattle['result']
    rank?: number
    trophyChange?: number
    starPlayer?: { tag?: string } | null
    teams?: Participant[][]
    players?: Participant[]
  }
}

/**
 * 모드에 따라 구조가 다르다.
 * 팀 모드는 battle.teams (중첩), 쇼다운 계열은 battle.players (평면).
 * 새 모드가 언제든 추가되므로 둘 다 아니면 예외 대신 null 을 준다.
 */
export function parseBattle(item: BattleLogItem, myTag: string): ParsedBattle | null {
  const b = item?.battle
  if (!b) return null

  let me: Participant | undefined
  if (Array.isArray(b.teams)) {
    me = b.teams.flat().find(p => p?.tag === myTag)
  } else if (Array.isArray(b.players)) {
    me = b.players.find(p => p?.tag === myTag)
  } else {
    console.warn(`[battlelog] 알 수 없는 구조: mode=${b.mode}`)
    return null
  }
  if (!me) return null

  return {
    battleTime: item.battleTime,
    mode: b.mode ?? item.event?.mode ?? 'unknown',
    map: item.event?.map ?? null,
    brawlerId: me.brawler?.id ?? null,
    result: b.result ?? null,
    rank: typeof b.rank === 'number' ? b.rank : null,
    trophyChange: typeof b.trophyChange === 'number' ? b.trophyChange : null,
    isStarPlayer: b.starPlayer?.tag === myTag,
  }
}
