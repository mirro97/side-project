'use client'
import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { countByMode, filterByMode, toEventViews, type EventView } from '@/lib/events'
import { FilterChips, type ChipOption } from '@/components/brawlers/FilterChips'
import { EmptyState } from '@/components/state/EmptyState'
import { EventCard } from './EventCard'
import type { EventSlot } from '@/types/api'
import type { Locale } from '@/types/game'

interface EventsResult {
  ok: boolean
  data?: EventSlot[]
}

/**
 * 모드 필터는 로컬 상태다. URL 에 두면 목록이 useSearchParams 아래로 들어가
 * 서버가 그린 카드가 버려진다 (랭킹에서 실측으로 확인했다).
 * 이 페이지에는 URL 에 둘 상세도 없어서 Suspense 경계 자체가 필요 없다.
 */
export function EventBrowser({ initial, locale }: { initial: EventView[]; locale: Locale }) {
  const t = useTranslations('events')
  const [views, setViews] = useState(initial)
  const [modeId, setModeId] = useState<number | null>(null)

  /**
   * 30분 캐시가 걸린 정적 페이지라 보는 동안 슬롯이 끝날 수 있다.
   * 만료된 것을 빼고, 전부 빠지면 로테이션을 다시 받는다.
   */
  const handleEnded = useCallback((slotId: number) => {
    setViews(prev => {
      const next = prev.filter(v => v.slotId !== slotId)
      if (next.length === 0) {
        void fetch('/api/events')
          .then(r => r.json() as Promise<EventsResult>)
          .then(j => {
            if (j.ok && j.data) setViews(toEventViews(j.data))
          })
          .catch(() => {})
      }
      return next
    })
  }, [])

  const counts = countByMode(views)
  const options: ChipOption[] = Object.entries(counts)
    .map(([id, count]) => ({ key: id, label: modeLabel(views, Number(id), locale), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const shown = filterByMode(views, modeId)

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <h1 className="text-[17px] font-bold">{t('title')}</h1>

      <FilterChips
        options={options}
        selected={modeId === null ? null : String(modeId)}
        allLabel={t('allModes')}
        allCount={views.length}
        onSelect={key => setModeId(key === null ? null : Number(key))}
      />

      {shown.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map(v => (
            <EventCard key={v.slotId} view={v} locale={locale} onEnded={handleEnded} />
          ))}
        </div>
      )}
    </div>
  )
}

/** 모드명은 뷰에 이미 현지화되어 들어 있다. 없으면 맵 이름으로 대신한다 */
function modeLabel(views: EventView[], modeId: number, locale: Locale): string {
  const hit = views.find(v => v.modeId === modeId)
  return hit?.modeName?.[locale] ?? String(modeId)
}
