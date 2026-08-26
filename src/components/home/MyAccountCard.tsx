'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { PlayerSummary } from '@/components/player/PlayerSummary'
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

  return <PlayerSummary player={data.data} locale={locale} />
}
