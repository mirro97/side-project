'use client'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useInfiniteList, type Page } from '@/hooks/useInfiniteList'
import { useMainAccount } from '@/hooks/useMainAccount'
import { BsError, type BsErrorKind } from '@/lib/bs/errors'
import { nextCursorOf, sameTag, toClubRow, toPlayerRow, type RankRowData, type RankingKind } from '@/lib/ranking'
import { RankRow } from '@/components/rank/RankRow'
import { EmptyState } from '@/components/state/EmptyState'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import type { ClubRankingEntry, Paged, RankingEntry } from '@/types/api'

interface RankingResult {
  ok: boolean
  data?: Paged<RankingEntry | ClubRankingEntry>
  kind?: BsErrorKind
}

/**
 * 커서 기반 무한 스크롤 목록. kind 만 바꿔 플레이어와 클럽이 같은 구현을 쓴다.
 *
 * kind·country 가 바뀌면 부모가 key 를 바꿔 다시 마운트한다.
 * 목록을 이어붙이면 안 되는 변경이라 리셋보다 재마운트가 안전하다.
 */
export function RankingList({
  kind,
  country,
  initial,
  onSelect,
}: {
  kind: RankingKind
  country: string
  /** 서버가 그린 첫 페이지. 기본값 조합일 때만 들어온다 */
  initial?: Page<RankRowData>
  onSelect?: (tag: string) => void
}) {
  const t = useTranslations('ranking')
  const { mainAccountTag } = useMainAccount()

  const loader = useCallback(
    async (cursor?: string): Promise<Page<RankRowData>> => {
      const q = new URLSearchParams({ country })
      // 커서는 불투명 토큰이다. 그대로 실어 보낸다
      if (cursor) q.set('after', cursor)
      const res = await fetch(`/api/ranking/${kind}?${q}`)
      const json = (await res.json()) as RankingResult
      if (!json.ok || !json.data) throw new BsError(json.kind ?? 'Unknown', res.status)
      const items = json.data.items.map(e =>
        kind === 'players' ? toPlayerRow(e as RankingEntry) : toClubRow(e as ClubRankingEntry),
      )
      return { items, nextCursor: nextCursorOf(json.data) }
    },
    [kind, country],
  )

  const { items, loading, error, hasMore, loadMore, reset } = useInfiniteList<RankRowData>(
    loader,
    initial,
  )

  if (error) {
    return (
      <ErrorState
        kind={error instanceof BsError ? error.kind : 'Unknown'}
        onRetry={() => void reset()}
      />
    )
  }
  if (!loading && items.length === 0) return <EmptyState message={t('empty')} />

  // 대표 계정이 200위 안에 없으면 목록을 다 받은 뒤에 알려준다
  const meListed = items.some(r => sameTag(r.tag, mainAccountTag))
  const showNotRanked = Boolean(mainAccountTag) && !meListed && !hasMore && kind === 'players'

  return (
    <>
      <div className="border-border-subtle bg-bg-surface rounded-panel border">
        {items.map(r => (
          <RankRow
            key={r.tag}
            rank={r.rank}
            name={r.name}
            trophies={r.trophies}
            iconUrl={r.iconUrl}
            subtitle={r.subtitle}
            nameColor={r.nameColor}
            isMe={sameTag(r.tag, mainAccountTag)}
            // 클럽 상세는 v2 다. 플레이어 행만 연다
            onClick={kind === 'players' && onSelect ? () => onSelect(r.tag) : undefined}
          />
        ))}
      </div>

      {loading && (
        <div className="mt-2">
          <RowSkeleton count={3} />
        </div>
      )}

      {!loading && hasMore && (
        <button
          onClick={() => void loadMore()}
          className="border-border-strong text-text-secondary rounded-card mt-4 w-full border py-2.5 text-[12px] font-semibold"
        >
          {t('loadMore')}
        </button>
      )}

      {!loading && !hasMore && (
        <p className="text-text-tertiary mt-4 text-center text-[11px]">
          {t('limitNotice')}
          {showNotRanked && <span className="mt-1 block">{t('notRanked')}</span>}
        </p>
      )}
    </>
  )
}
