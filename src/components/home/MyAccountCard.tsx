'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { getBrawler } from '@/lib/game-data'
import { pickMainBrawler } from '@/lib/home'
import { formatTrophies, stripNameMarkup } from '@/lib/format'
import { EmptyState } from '@/components/state/EmptyState'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { Player } from '@/types/api'
import type { Locale } from '@/types/game'

interface PlayerResult {
  ok: boolean
  data?: Player
  kind?: BsErrorKind
}

/** 실패해도 kind 를 들고 와야 UI 가 분기할 수 있어 throw 하지 않는다 */
async function fetchPlayer(tag: string): Promise<PlayerResult> {
  const res = await fetch(`/api/player/${encodeURIComponent(tag)}`)
  return (await res.json()) as PlayerResult
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-bg-elevated rounded-chip flex-1 px-2 py-1.5 text-center">
      <b className={`block text-[13px] font-bold ${accent ? 'text-trophy' : ''}`}>{value}</b>
      <i className="text-text-tertiary mt-px block text-[9px] not-italic">{label}</i>
    </div>
  )
}

export function MyAccountCard({ locale }: { locale: Locale }) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const { mainAccountTag } = useMainAccount()

  const { data, isPending, isError } = useQuery({
    queryKey: ['player', mainAccountTag],
    queryFn: () => fetchPlayer(mainAccountTag as string),
    enabled: Boolean(mainAccountTag),
  })

  if (!mainAccountTag) {
    return (
      <EmptyState
        message={t('setAccountPrompt')}
        action={
          <Link
            href={`/${locale}/profile`}
            className="bg-brand rounded-card px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {tc('setAccount')}
          </Link>
        }
      />
    )
  }
  if (isPending) {
    return (
      <div className="p-3">
        <RowSkeleton count={2} />
      </div>
    )
  }
  if (isError || !data?.ok || !data.data) {
    return <ErrorState kind={data?.kind ?? 'Unknown'} />
  }

  const player = data.data
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
