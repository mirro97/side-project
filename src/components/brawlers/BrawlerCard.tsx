import { formatTrophies } from '@/lib/format'
import type { Brawler, Locale } from '@/types/game'

export interface BrawlerProgress {
  power: number
  trophies: number
}

export function BrawlerCard({
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
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`border-border-subtle bg-bg-surface rounded-card overflow-hidden border text-left ${
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
}
