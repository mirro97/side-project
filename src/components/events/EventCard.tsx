'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CountdownTimer } from '@/components/display/CountdownTimer'
import { LocalTime } from '@/components/display/LocalTime'
import type { EventView } from '@/lib/events'
import type { Locale } from '@/types/game'

export function EventCard({
  view,
  locale,
  onEnded,
}: {
  view: EventView
  locale: Locale
  onEnded: (slotId: number) => void
}) {
  const t = useTranslations('events')
  // 신규 맵은 CDN 반영이 늦어 404 가 난다. 그때는 배경 없이 그린다
  const [bgFailed, setBgFailed] = useState(false)

  return (
    <div className="border-border-subtle bg-bg-surface rounded-card relative overflow-hidden border">
      {!bgFailed && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={view.mapImageUrl}
            alt=""
            aria-hidden
            onError={() => setBgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="from-bg-surface absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />
        </>
      )}

      <div className="relative flex items-center gap-2.5 px-3 py-3">
        {view.modeIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={view.modeIconUrl}
            alt=""
            width={30}
            height={30}
            className="h-[30px] w-[30px] shrink-0"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-bold">
              {view.modeName?.[locale] ?? view.mapName}
            </span>
            {view.modifiers.map((m, i) => (
              <span
                key={i}
                className="bg-brand/20 text-brand-hover shrink-0 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold"
              >
                {/* 이름을 확신할 수 없으면 일반 문구를 쓴다. 지어내지 않는다 */}
                {m.name?.[locale] ?? t('specialRule')}
              </span>
            ))}
          </div>
          <div className="text-text-tertiary truncate text-[11px]">{view.mapName}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <CountdownTimer end={view.end} onEnded={() => onEnded(view.slotId)} />
          <LocalTime at={view.end} locale={locale} />
        </div>
      </div>
    </div>
  )
}
