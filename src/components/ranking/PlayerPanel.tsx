'use client'
import { useQuery } from '@tanstack/react-query'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { PlayerSummary } from '@/components/player/PlayerSummary'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import { stripNameMarkup } from '@/lib/format'
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
  const { data, isPending, isError } = useQuery({
    queryKey: ['player', tag],
    queryFn: () => fetchPlayer(tag as string),
    enabled: Boolean(tag),
  })

  const player = data?.ok ? data.data : undefined

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
        <ErrorState kind={data?.kind ?? 'Unknown'} />
      ) : (
        <PlayerSummary player={player} locale={locale} />
      )}
    </DetailPanel>
  )
}
