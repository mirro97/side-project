'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { usePlayer } from '@/hooks/usePlayer'
import { PlayerSummary } from '@/components/player/PlayerSummary'
import { EmptyState } from '@/components/state/EmptyState'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import type { Locale } from '@/types/game'

export function MyAccountCard({ locale }: { locale: Locale }) {
  const t = useTranslations('home')
  const tc = useTranslations('common')
  const { mainAccountTag } = useMainAccount()

  const { player, isPending, isError, errorKind, refetch } = usePlayer(mainAccountTag)

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
  if (isError || !player) {
    return <ErrorState kind={errorKind} onRetry={() => void refetch()} />
  }

  return <PlayerSummary player={player} locale={locale} />
}
