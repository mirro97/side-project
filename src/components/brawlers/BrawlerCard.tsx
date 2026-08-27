import { memo } from 'react'
import { formatTrophies } from '@/lib/format'
import type { Brawler, Locale } from '@/types/game'

export interface BrawlerProgress {
  power: number
  trophies: number
}

/**
 * memo + id 기반 onSelect — 검색어를 칠 때마다 최대 ~106장이 새로 리렌더되지
 * 않도록 한다. onSelect 가 카드마다 새 클로저가 아니라 안정된 참조여야 memo 가 먹힌다
 */
export const BrawlerCard = memo(function BrawlerCard({
  brawler,
  locale,
  progress,
  locked,
  onSelect,
}: {
  brawler: Brawler
  locale: Locale
  /** 대표 계정이 있고 보유 중일 때만 */
  progress?: BrawlerProgress
  /** 대표 계정이 있고 미보유일 때만 */
  locked?: boolean
  onSelect: (id: number) => void
}) {
  return (
    <button
      onClick={() => onSelect(brawler.id)}
      className={`border-border-subtle bg-bg-surface rounded-card relative overflow-hidden border text-left transition-transform hover:z-10 hover:scale-105 hover:border-brand ${
        locked ? 'opacity-30' : ''
      }`}
    >
      <div className="bg-bg-elevated relative aspect-square overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 z-10 h-1.5"
          style={{ background: brawler.rarity.color }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brawler.images.portrait}
          alt=""
          width={120}
          height={120}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {progress && (
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/85 to-transparent px-1.5 py-1 text-[9px] font-bold">
            <span>P{progress.power}</span>
            <span className="text-trophy">{formatTrophies(progress.trophies)}</span>
          </div>
        )}
      </div>
      <div className="truncate px-1 py-1.5 text-center text-[10px] font-semibold">
        {brawler.name[locale]}
      </div>
    </button>
  )
})
