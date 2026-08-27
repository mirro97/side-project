'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getBrawler, getBrawlers } from '@/lib/game-data'
import { formatTrophies, stripNameMarkup } from '@/lib/format'
import { summarizeBrawlers } from '@/lib/profile'
import type { Player } from '@/types/api'
import type { Locale } from '@/types/game'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated rounded-chip flex-1 px-2 py-1.5 text-center">
      <b className="block text-[13px] font-bold">{value}</b>
      <i className="text-text-tertiary mt-px block text-[9px] not-italic">{label}</i>
    </div>
  )
}

/**
 * PlayerSummary 가 그리지 않는 것만 맡는다 — 승수·클럽·보유 브롤러 요약.
 * PlayerSummary 를 키우면 홈의 좁은 카드가 함께 커져서 따로 둔다.
 *
 * 보유 브롤러 그리드는 만들지 않는다. 브롤러 탭이 이미 정렬·필터까지 하고,
 * 대표 계정이 있으면 거기서 진행도를 얹어 보여준다.
 */
export function AccountStats({ player, locale }: { player: Player; locale: Locale }) {
  const t = useTranslations('profile')
  const tc = useTranslations('common')

  // 생성 데이터 기준 종수다. 신규 브롤러가 나오면 데이터를 다시 뽑을 때까지 분모가 늦다
  const { ownedCount, total, top } = summarizeBrawlers(player.brawlers, getBrawlers().length)

  return (
    <section className="border-border-subtle bg-bg-surface rounded-card flex flex-col gap-2.5 border p-3">
      <div className="flex gap-1.5">
        <Stat label={t('stats.victories3v3')} value={formatTrophies(player['3vs3Victories'])} />
        <Stat label={t('stats.solo')} value={formatTrophies(player.soloVictories)} />
        <Stat label={t('stats.duo')} value={formatTrophies(player.duoVictories)} />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-text-tertiary shrink-0">{t('stats.club')}</span>
        <span className="truncate font-semibold">
          {player.club ? stripNameMarkup(player.club.name) : t('stats.noClub')}
        </span>
      </div>

      <div className="border-border-subtle flex items-center gap-2 border-t pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-text-tertiary text-[11px]">{t('stats.owned')}</div>
          <div className="text-[13px] font-bold">
            {ownedCount} / {total}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {top.map(b => {
            const meta = getBrawler(b.id)
            return meta ? (
              <span key={b.id} className="flex flex-col items-center gap-0.5">
                {/* CDN 이미지는 next/image 최적화를 태우지 않는다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meta.images.portrait}
                  alt={meta.name[locale]}
                  width={34}
                  height={34}
                  className="bg-bg-elevated rounded-chip h-[34px] w-[34px] object-cover"
                />
                <span className="text-trophy text-[9px] font-bold">
                  {formatTrophies(b.trophies)}
                </span>
              </span>
            ) : null
          })}
        </div>
        <Link
          href={`/${locale}/brawlers`}
          className="border-border-strong text-text-secondary rounded-card shrink-0 border px-2.5 py-1 text-[11px] font-semibold"
        >
          {tc('seeAll')}
        </Link>
      </div>
    </section>
  )
}
