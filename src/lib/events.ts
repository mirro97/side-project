import { getMode } from './game-data'
import { sortByEndingSoon } from './home'
import { parseBrawlTime } from './bs/parse'
import type { EventSlot } from '@/types/api'
import type { LocalizedText } from '@/types/game'

/** 화면이 바로 쓸 수 있는 모양 */
export interface EventView {
  slotId: number
  modeId: number
  /** 생성 데이터에 없는 신규 모드면 null 이다 */
  modeName: LocalizedText | null
  modeIconUrl: string | null
  mapName: string
  mapImageUrl: string
  end: Date
  modifiers: ModifierLabel[]
}

export interface ModifierLabel {
  /** 로케일 값과 대조해 확인한 이름. 확인되지 않았으면 없다 */
  name?: LocalizedText
}

const MAP_IMAGE = 'https://cdn.brawlify.com/maps/regular'
const MODE_ICON = 'https://cdn.brawlify.com/game-modes/regular'

/**
 * 공식 API 의 modifier 문자열과 게임 CSV 의 내부 이름이 갈라진다.
 * 정규화 매칭은 18개 중 9개만 맞았다 (angryRobo ↔ BigRobo, superCharge ↔ FastSuperCharge …).
 *
 * 이름을 추측하면 틀린 이름을 보여주게 된다. 브롤러 TID 를 추측했다가 4개 전부
 * 틀린 적이 있어서, 여기서는 **로케일 값과 눈으로 대조한 것만** 넣는다.
 * 실제 로테이션에서 새 값이 보이면 그때 확인하고 추가한다.
 */
const VERIFIED_MODIFIERS: Record<string, LocalizedText> = {
  // TID_EVENT_MODIFIER_15 — texts: "SHOWDOWN+", kr: "쇼다운+" (게임은 대문자로 쓴다)
  'showdown+': { en: 'Showdown+', ko: '쇼다운+' },
}

/** 모디파이어가 없다는 뜻으로 오는 값들. 배지를 만들지 않는다 */
const NO_MODIFIER = new Set(['none', 'unknown'])

export function modifierLabels(raw: string[] | undefined): ModifierLabel[] {
  if (!raw?.length) return []
  return raw
    .filter(m => !NO_MODIFIER.has(m.toLowerCase()))
    .map(m => {
      const name = VERIFIED_MODIFIERS[m.toLowerCase()]
      // 이름을 확신할 수 없으면 비워 둔다. 화면이 일반 문구로 대신한다
      return name ? { name } : {}
    })
}

export function toEventViews(slots: EventSlot[], now: Date = new Date()): EventView[] {
  return sortByEndingSoon(slots, now).flatMap(s => {
    const end = parseBrawlTime(s.endTime)
    // sortByEndingSoon 이 이미 걸러내지만 타입을 좁히려면 다시 본다
    if (!end) return []
    const mode = getMode(s.event.modeId)
    return [
      {
        slotId: s.slotId,
        modeId: s.event.modeId,
        modeName: mode?.name ?? null,
        // 48000000 오프셋이 붙은 imageId 를 써야 한다. modeId 를 그대로 넣으면 404
        modeIconUrl: mode ? `${MODE_ICON}/${mode.imageId}.png` : null,
        mapName: s.event.map,
        mapImageUrl: `${MAP_IMAGE}/${s.event.id}.png`,
        end,
        modifiers: modifierLabels(s.event.modifiers),
      },
    ]
  })
}

export function countByMode(views: EventView[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const v of views) out[v.modeId] = (out[v.modeId] ?? 0) + 1
  return out
}

export function filterByMode(views: EventView[], modeId: number | null): EventView[] {
  return modeId === null ? views : views.filter(v => v.modeId === modeId)
}
