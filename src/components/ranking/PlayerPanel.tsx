'use client'
import { usePlayer } from '@/hooks/usePlayer'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { PlayerSummary } from '@/components/player/PlayerSummary'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import { stripNameMarkup } from '@/lib/format'
import type { Locale } from '@/types/game'

/** 랭킹 행을 눌렀을 때 뜨는 요약. 전체 프로필은 플랜 06 의 페이지가 맡는다 */
export function PlayerPanel({
  tag,
  locale,
  onClose,
}: {
  tag: string | null
  locale: Locale
  onClose: () => void
}) {
  // 홈 카드와 같은 키라 react-query 가 요청을 합친다
  const { player, isPending, isError, errorKind, refetch } = usePlayer(tag)

  return (
    <DetailPanel
      open={Boolean(tag)}
      onClose={onClose}
      title={player ? stripNameMarkup(player.name) : ''}
    >
      {isPending ? (
        <div className="p-3">
          <RowSkeleton count={2} />
        </div>
      ) : isError || !player ? (
        <ErrorState kind={errorKind} onRetry={() => void refetch()} />
      ) : (
        <PlayerSummary player={player} locale={locale} />
      )}
    </DetailPanel>
  )
}
