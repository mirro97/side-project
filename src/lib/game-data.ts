import raw from '@/data/game-data.generated.json'
import type { Brawler, GameData, GameMode } from '@/types/game'

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
