import { getModeByKey } from './game-data'
import { sameTag } from './ranking'
import type { ParsedBattle, PlayerBrawler } from '@/types/api'
import type { Locale } from '@/types/game'

/**
 * 브롤스타즈 태그에 실제로 존재하는 문자만.
 * lib/bs/client 의 isValidTag 와 같은 집합이지만 그쪽은 서버 전용 모듈이라
 * (bsFetch 가 토큰을 읽는다) 클라이언트로 끌고 오지 않는다.
 */
const TAG_CHARS = /^[0289PYLQGRJCUV]+$/

/**
 * 입력 태그를 저장·비교용으로 정규화한다.
 * # 유무와 대소문자가 섞여 들어오고, 붙여넣기하면 앞뒤 공백도 함께 온다.
 */
export function normalizeTag(raw: string): string | null {
  const bare = raw.trim().replace(/^#/, '').toUpperCase()
  if (!bare || !TAG_CHARS.test(bare)) return null
  return `#${bare}`
}

/** 표기가 달라도 같은 태그면 하나로 본다 (#abc = ABC) */
export function addFavorite(list: string[], tag: string): string[] {
  const norm = normalizeTag(tag)
  if (!norm) return list
  if (list.some(t => sameTag(t, norm))) return list
  return [...list, norm]
}

export function removeFavorite(list: string[], tag: string): string[] {
  return list.filter(t => !sameTag(t, tag))
}

/** 대표 계정은 바로 위에 따로 보이므로 즐겨찾기 목록에서 뺀다 */
export function visibleFavorites(list: string[], mainTag: string | null): string[] {
  return list.filter(t => !sameTag(t, mainTag))
}

export interface BattleSummary {
  wins: number
  losses: number
  draws: number
  /** 트로피 증감 합. 음수일 수 있다 */
  trophyDelta: number
}

/**
 * 최근 전투 요약.
 *
 * 쇼다운 계열에는 result 가 없고 rank 만 온다(실측: soloShowdown rank=2, result 없음).
 * 등수를 승패로 바꾸는 규칙은 모드마다 달라 지어내지 않는다 — 승패 집계에서 빠지고
 * 트로피 증감에만 반영된다. 그래서 승패가 0/0 인 계정이 실제로 나온다.
 */
export function summarizeBattles(battles: ParsedBattle[]): BattleSummary {
  const out: BattleSummary = { wins: 0, losses: 0, draws: 0, trophyDelta: 0 }
  for (const b of battles) {
    if (b.result === 'victory') out.wins++
    else if (b.result === 'defeat') out.losses++
    else if (b.result === 'draw') out.draws++
    out.trophyDelta += b.trophyChange ?? 0
  }
  return out
}

/** 프로필에 요약으로 보여줄 개수. 자세한 목록은 브롤러 탭이 맡는다 */
const TOP_COUNT = 3

export function summarizeBrawlers(owned: PlayerBrawler[], total: number) {
  const top = [...owned].sort((a, b) => b.trophies - a.trophies).slice(0, TOP_COUNT)
  return { ownedCount: owned.length, total, top }
}

/** camelCase API 키를 사람이 읽을 수 있게 띄운다. lastStand → Last Stand */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * 배틀로그의 battle.mode 는 'brawlBall' 같은 API 키다.
 *
 * 생성 데이터에 있는 모드는 현지화 이름을 쓴다. 다만 영어 이름은 빌드 스크립트가
 * API 키를 그대로 넣어둔 자리라(모드에는 EN 로케일 소스가 없다) 번역이 아니다.
 * 그 경우와 데이터에 아예 없는 모드(heist·megaBoss·wipeout 등 실측으로 확인)는
 * 키를 읽을 수 있게 다듬어 보여준다 — 이름을 지어내지 않는다.
 */
export function modeLabel(apiKey: string, locale: Locale): string {
  const name = getModeByKey(apiKey)?.name[locale]
  return !name || name === apiKey ? humanize(apiKey) : name
}
