'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { countByMode, filterByMode, toEventViews, type EventView } from '@/lib/events'
import { modeLabel } from '@/lib/game-data'
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
   * 만료된 것을 뺀다.
   *
   * 재조회는 업데이터 안에서 하지 않는다 — React 는 업데이터를 순수 함수로 보고
   * StrictMode 에서 두 번 호출하므로 요청이 두 번 나간다.
   */
  const handleEnded = useCallback((slotId: number) => {
    setViews(prev => prev.filter(v => v.slotId !== slotId))
  }, [])

  // 목록이 비면 로테이션을 다시 받는다. 한 번만 나가도록 잠근다
  const refetching = useRef(false)
  useEffect(() => {
    if (views.length > 0 || refetching.current) return
    refetching.current = true
    fetch('/api/events')
      .then(r => r.json() as Promise<EventsResult>)
      .then(j => {
        if (j.ok && j.data) setViews(toEventViews(j.data))
      })
      .catch(() => {})
      .finally(() => {
        refetching.current = false
      })
  }, [views.length])

  const counts = countByMode(views)
  const options: ChipOption[] = Object.entries(counts)
    .map(([id, count]) => ({ key: id, label: chipLabel(views, Number(id), locale), count }))
    // localeCompare 에 로케일을 넘기지 않으면 실행 환경의 기본 로케일을 쓴다.
    // 서버(Node)는 라틴 문자를 앞에, 브라우저(ko)는 한글을 앞에 놓아 칩 순서가 갈리고
    // 하이드레이션이 깨진다 — 실측으로 확인했다. lib/brawlers 의 정렬과 같은 규칙이다
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale))

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

/** 칩은 modeId 로 묶여 있어 먼저 그 모드의 슬롯을 찾아 API 키를 꺼낸다 */
function chipLabel(views: EventView[], modeId: number, locale: Locale): string {
  const hit = views.find(v => v.modeId === modeId)
  return hit ? modeLabel(hit.modeKey, locale) : String(modeId)
}
