'use client'
import { useTranslations } from 'next-intl'
import { getBrawler } from '@/lib/game-data'
import { pickMainBrawler } from '@/lib/home'
import { formatTrophies, stripNameMarkup } from '@/lib/format'
import type { Player } from '@/types/api'
import type { Locale } from '@/types/game'

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-bg-elevated rounded-chip flex-1 px-2 py-1.5 text-center">
      <b className={`block text-[13px] font-bold ${accent ? 'text-trophy' : ''}`}>{value}</b>
      <i className="text-text-tertiary mt-px block text-[9px] not-italic">{label}</i>
    </div>
  )
}

/**
 * 플레이어 한 명의 요약. 조회는 하지 않고 받은 것만 그린다.
 * 홈의 내 계정 카드와 랭킹의 상세 패널이 같은 것을 쓴다.
 *
 * 라벨은 home 네임스페이스에 있다. 이 컴포넌트를 위해 키를 옮기지 않았다 —
 * 문구가 같은데 두 벌로 갈리면 번역이 어긋난다.
 */
export function PlayerSummary({ player, locale }: { player: Player; locale: Locale }) {
  const t = useTranslations('home')
  const top = pickMainBrawler(player.brawlers)
  const meta = top ? getBrawler(top.id) : null

  return (
    <div className="flex items-center gap-3 p-3.5">
      {meta && top && (
        <div className="bg-bg-elevated rounded-card relative h-16 w-16 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.images.portrait} alt="" className="h-full w-full object-cover" />
          <span className="text-trophy absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-bold">
            {formatTrophies(top.trophies)}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{stripNameMarkup(player.name)}</div>
        <div className="text-text-tertiary mt-0.5 truncate text-[11px]">
          {player.tag}
          {meta && ` · ${t('mainBrawler')} ${meta.name[locale]}`}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Stat label={t('trophies')} value={formatTrophies(player.trophies)} accent />
          <Stat label={t('highest')} value={formatTrophies(player.highestTrophies)} />
          <Stat label={t('level')} value={String(player.expLevel)} />
        </div>
      </div>
    </div>
  )
}
