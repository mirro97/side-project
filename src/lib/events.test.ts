import { describe, it, expect } from 'vitest'
import { countByMode, filterByMode, modifierLabels, toEventViews } from './events'
import type { EventSlot } from '@/types/api'

const NOW = new Date('2026-08-26T15:00:00Z')

/** 실측 응답에서 가져온 형태 그대로 */
function slot(
  slotId: number,
  modeId: number,
  endTime: string,
  extra: Partial<EventSlot['event']> = {},
): EventSlot {
  return {
    startTime: '20260826T080000.000Z',
    endTime,
    slotId,
    event: { id: 15000118, mode: 'brawlBall', modeId, map: 'Pinball Dreams', ...extra },
  }
}

describe('toEventViews', () => {
  it('종료 임박순으로 정렬한다', () => {
    const views = toEventViews(
      [
        slot(1, 5, '20260827T080000.000Z'),
        slot(2, 3, '20260826T160000.000Z'),
        slot(3, 6, '20260827T020000.000Z'),
      ],
      NOW,
    )
    expect(views.map(v => v.slotId)).toEqual([2, 3, 1])
  })

  it('이미 끝난 슬롯은 뺀다', () => {
    // 응답과 렌더 사이에 만료될 수 있다
    const views = toEventViews([slot(1, 5, '20260826T140000.000Z')], NOW)
    expect(views).toHaveLength(0)
  })

  it('맵 이미지는 event.id 를 쓴다', () => {
    const [v] = toEventViews([slot(1, 5, '20260827T080000.000Z')], NOW)
    expect(v.mapImageUrl).toBe('https://cdn.brawlify.com/maps/regular/15000118.png')
  })

  it('모드 아이콘은 modeId 가 아니라 imageId 를 쓴다', () => {
    // modeId 를 그대로 넣으면 404 다. 48000000 오프셋이 붙어야 한다
    const [v] = toEventViews([slot(1, 5, '20260827T080000.000Z')], NOW)
    expect(v.modeIconUrl).toBe('https://cdn.brawlify.com/game-modes/regular/48000005.png')
    expect(v.modeKey).toBe('brawlBall')
  })

  it('생성 데이터에 없는 모드는 아이콘만 비우고 키는 남긴다', () => {
    // 신규 모드는 항상 데이터가 늦다. 아이콘은 포기해도 이름은 키에서 만들 수 있다
    const [v] = toEventViews(
      [slot(1, 999999, '20260827T080000.000Z', { mode: 'futureMode' })],
      NOW,
    )
    expect(v.modeKey).toBe('futureMode')
    expect(v.modeIconUrl).toBeNull()
  })

  it('파싱할 수 없는 시각은 버린다', () => {
    expect(toEventViews([slot(1, 5, '2026-08-27T08:00:00Z')], NOW)).toHaveLength(0)
  })
})

describe('modifierLabels', () => {
  it('없으면 빈 배열이다', () => {
    expect(modifierLabels(undefined)).toEqual([])
    expect(modifierLabels([])).toEqual([])
  })

  it('none 과 unknown 은 배지를 만들지 않는다', () => {
    // unknown 은 API 가 신규 모디파이어를 모를 때 보낸다
    expect(modifierLabels(['unknown'])).toEqual([])
    expect(modifierLabels(['none'])).toEqual([])
  })

  it('확인된 값만 이름을 붙인다', () => {
    expect(modifierLabels(['showdown+'])).toEqual([
      { name: { en: 'Showdown+', ko: '쇼다운+' } },
    ])
  })

  it('확인되지 않은 값은 이름을 지어내지 않는다', () => {
    // 공식 API 이름과 CSV 내부 이름이 갈라져 자동 매칭이 안 된다
    expect(modifierLabels(['angryRobo'])).toEqual([{}])
  })

  it('섞여 오면 unknown 만 걸러낸다', () => {
    expect(modifierLabels(['unknown', 'showdown+'])).toEqual([
      { name: { en: 'Showdown+', ko: '쇼다운+' } },
    ])
  })
})

describe('countByMode / filterByMode', () => {
  const views = toEventViews(
    [
      slot(1, 5, '20260827T080000.000Z'),
      slot(2, 5, '20260827T090000.000Z'),
      slot(3, 3, '20260827T100000.000Z'),
    ],
    NOW,
  )

  it('모드별로 센다', () => {
    expect(countByMode(views)).toEqual({ 5: 2, 3: 1 })
  })

  it('null 이면 전부 통과시킨다', () => {
    expect(filterByMode(views, null)).toHaveLength(3)
  })

  it('모드로 거른다', () => {
    expect(filterByMode(views, 5).map(v => v.slotId)).toEqual([1, 2])
  })
})
