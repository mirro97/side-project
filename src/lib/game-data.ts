import raw from '@/data/game-data.generated.json'
import type { Brawler, GameData, GameMode, Locale } from '@/types/game'

const data = raw as unknown as GameData

const byId = new Map(data.brawlers.map(b => [b.id, b]))
const modeById = new Map(data.modes.map(m => [m.modeId, m]))
const modeByKey = new Map(data.modes.map(m => [m.apiKey, m]))

export function getBrawlers(): Brawler[] {
  return data.brawlers
}

export function getBrawler(id: number): Brawler | undefined {
  return byId.get(id)
}

export function getMode(modeId: number): GameMode | undefined {
  return modeById.get(modeId)
}

/** 정규화 기준. StatBar 눈금과 공유한다 */
export function getRanges() {
  return data.ranges
}

/** 영문·한글을 모두 인덱싱한다. 영어 UI 에서 "쉘리"를 쳐도 잡혀야 한다 */
export function searchBrawlers(query: string): Brawler[] {
  const q = query.trim().toLowerCase()
  if (!q) return data.brawlers
  return data.brawlers.filter(
    b => b.name.en.toLowerCase().includes(q) || b.name.ko.toLowerCase().includes(q),
  )
}

/** 배틀로그는 modeId 대신 'brawlBall' 같은 API 키로 모드를 알려준다 */
export function getModeByKey(apiKey: string): GameMode | undefined {
  return modeByKey.get(apiKey)
}

/**
 * camelCase API 키를 사람이 읽을 수 있게 띄운다. lastStand → Last Stand
 *
 * 숫자 경계를 먼저 끊되 **첫 번째 것만** 끊는다. 대소문자만 보면 brawlBall5V5 가
 * "Brawl Ball5 V5" 가 되고, 숫자 앞을 전부 끊으면 deathmatch5v5 가 "Deathmatch 5v 5" 로
 * 쪼개진다. 단어와 숫자 접미사를 가르는 경계는 하나뿐이다.
 */
function humanize(key: string): string {
  const spaced = key.replace(/([a-z])(\d)/, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * 모드 표시 이름. 공식 API 는 어디서나 'brawlBall' 같은 키로 모드를 알려준다
 * (이벤트 로테이션의 event.mode, 배틀로그의 battle.mode).
 *
 * 생성 데이터에 있는 모드는 현지화 이름을 쓴다. 다만 **영어 이름은 번역이 아니다** —
 * 빌드 스크립트가 API 키를 그대로 넣어둔 자리다(모드에는 EN 로케일 소스가 없다).
 * 그 경우와 데이터에 아예 없는 모드(heist·megaBoss·wipeout·lastStand 등 실측 확인)는
 * 키를 읽을 수 있게 다듬어 보여준다 — 이름을 지어내지 않는다.
 *
 * 폴백을 각자 두면 화면마다 달라진다. 실제로 이벤트 칩은 modeId 숫자를,
 * 카드는 맵 이름을, 홈은 날것의 키를 보여주고 있었다.
 */
export function modeLabel(apiKey: string, locale: Locale): string {
  const name = modeByKey.get(apiKey)?.name[locale]
  return !name || name === apiKey ? humanize(apiKey) : name
}
