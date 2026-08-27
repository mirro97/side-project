'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { usePlayer } from '@/hooks/usePlayer'
import { PlayerSummary } from '@/components/player/PlayerSummary'
import { EmptyState } from '@/components/state/EmptyState'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import { normalizeTag } from '@/lib/profile'
import { TagForm } from './TagForm'
import { MainAccountAction } from './MainAccountAction'
import { FavoriteTags } from './FavoriteTags'
import { AccountStats } from './AccountStats'
import { RecentBattles } from './RecentBattles'
import type { Locale } from '@/types/game'

/**
 * 조회 대상 태그는 URL 에 둔다 — 공유 가능해야 한다.
 * 랭킹처럼 목록이 딸려 죽을 게 없어(서버가 그릴 데이터가 아예 없다)
 * useSearchParams 를 이 컴포넌트에서 그대로 쓰고, 페이지가 Suspense 로 감싼다.
 */
export function ProfileView({ locale }: { locale: Locale }) {
  const t = useTranslations('profile')
  const router = useRouter()
  const params = useSearchParams()
  const { mainAccountTag } = useMainAccount()

  // ?tag= 가 있으면 그 계정을, 없으면 대표 계정을 본다.
  // 손으로 고친 깨진 값은 없는 것으로 친다
  const queryTag = normalizeTag(params.get('tag') ?? '')
  const tag = queryTag ?? mainAccountTag

  // 홈·랭킹·추천과 같은 키라 react-query 가 요청을 합친다
  const { player, isPending, isError, errorKind, refetch } = usePlayer(tag)

  const show = (next: string) => router.push(`?tag=${encodeURIComponent(next)}`)

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <h1 className="text-[17px] font-bold">{t('title')}</h1>

      {/* 보는 계정이 바뀌면 입력칸도 그 태그로 맞춘다 */}
      <TagForm key={tag ?? ''} defaultValue={tag ?? ''} onSubmit={show} />

      {!tag ? (
        <EmptyState message={t('prompt')} />
      ) : isPending ? (
        <div className="border-border-subtle bg-bg-surface rounded-card border p-3">
          <RowSkeleton count={3} />
        </div>
      ) : isError || !player ? (
        <ErrorState kind={errorKind} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="border-border-subtle bg-bg-surface rounded-card border">
            <PlayerSummary player={player} locale={locale} />
            <div className="border-border-subtle flex justify-end border-t px-3 py-2">
              <MainAccountAction tag={player.tag} />
            </div>
          </div>
          <AccountStats player={player} locale={locale} />
          <RecentBattles tag={player.tag} locale={locale} />
        </>
      )}

      <FavoriteTags currentTag={player?.tag ?? null} onSelect={show} />
    </div>
  )
}
