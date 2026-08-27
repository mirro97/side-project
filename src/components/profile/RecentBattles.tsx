'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ErrorState } from '@/components/state/ErrorState'
import { RowSkeleton } from '@/components/state/Skeletons'
import { getBrawler } from '@/lib/game-data'
import { parseBattle, type BattleLogItem } from '@/lib/bs/parse'
import { modeLabel, summarizeBattles } from '@/lib/profile'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { ParsedBattle } from '@/types/api'
import type { Locale } from '@/types/game'

interface BattlelogResult {
  ok: boolean
  data?: { items: BattleLogItem[] }
  kind?: BsErrorKind
}

/** usePlayer 와 같은 이유로 throw 하지 않는다 — 화면이 kind 로 분기해야 한다 */
async function fetchBattlelog(tag: string): Promise<BattlelogResult> {
  const res = await fetch(`/api/player/${encodeURIComponent(tag)}/battlelog`)
  return (await res.json()) as BattlelogResult
}

function Row({ battle, locale }: { battle: ParsedBattle; locale: Locale }) {
  const t = useTranslations('profile.battles')
  const meta = battle.brawlerId ? getBrawler(battle.brawlerId) : null

  // 쇼다운 계열에는 result 가 없고 rank 만 온다 (실측)
  const outcome = battle.result
    ? t(battle.result)
    : battle.rank !== null
      ? t('rank', { rank: battle.rank })
      : null

  const tone =
    battle.result === 'victory'
      ? 'text-success'
      : battle.result === 'defeat'
        ? 'text-danger'
        : 'text-text-secondary'

  return (
    <li className="border-border-subtle flex items-center gap-2.5 border-b px-3 py-2 last:border-b-0">
      {meta ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.images.portrait}
          alt={meta.name[locale]}
          width={28}
          height={28}
          className="bg-bg-elevated rounded-chip h-7 w-7 shrink-0 object-cover"
        />
      ) : (
        <span className="bg-bg-elevated rounded-chip h-7 w-7 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{modeLabel(battle.mode, locale)}</div>
        {battle.map && (
          <div className="text-text-tertiary truncate text-[11px]">{battle.map}</div>
        )}
      </div>

      {outcome && <span className={`shrink-0 text-[11px] font-bold ${tone}`}>{outcome}</span>}
      {battle.trophyChange !== null && battle.trophyChange !== 0 && (
        <span
          className={`w-8 shrink-0 text-right text-[11px] font-bold ${
            battle.trophyChange > 0 ? 'text-success' : 'text-danger'
          }`}
        >
          {battle.trophyChange > 0 ? '+' : ''}
          {battle.trophyChange}
        </span>
      )}
    </li>
  )
}

/**
 * 최근 전투 25전. API 가 그만큼만 준다(실측 고정).
 * 전적 축적은 DB 가 필요해서 v1.5 로 미뤘고, 여기서는 준 것을 그대로 보여준다.
 */
export function RecentBattles({ tag, locale }: { tag: string; locale: Locale }) {
  const t = useTranslations('profile.battles')
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['battlelog', tag],
    queryFn: () => fetchBattlelog(tag),
  })

  const battles = useMemo(
    // 파싱 실패는 조용히 건너뛴다. 새 모드가 언제든 추가되고 파서가 null 을 준다
    () => (data?.ok ? (data.data?.items ?? []) : []).flatMap(i => parseBattle(i, tag) ?? []),
    [data, tag],
  )

  const summary = summarizeBattles(battles)
  const decided = summary.wins + summary.losses + summary.draws

  return (
    <section className="border-border-subtle bg-bg-surface rounded-card border">
      <div className="border-border-subtle flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h2 className="text-[13px] font-bold">{t('title')}</h2>
        {battles.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold">
            {/* 쇼다운만 도는 계정은 승패가 전부 0으로 나온다. 그때는 숨긴다 */}
            {decided > 0 && (
              <span className="text-text-secondary">
                {summary.wins}
                {t('victory')} · {summary.losses}
                {t('defeat')}
                {summary.draws > 0 && ` · ${summary.draws}${t('draw')}`}
              </span>
            )}
            <span className={summary.trophyDelta >= 0 ? 'text-success' : 'text-danger'}>
              {summary.trophyDelta > 0 ? '+' : ''}
              {summary.trophyDelta}
            </span>
          </div>
        )}
      </div>

      {isPending ? (
        <div className="p-3">
          <RowSkeleton count={4} />
        </div>
      ) : isError || !data?.ok ? (
        <ErrorState kind={data?.kind ?? 'Unknown'} onRetry={() => void refetch()} />
      ) : battles.length === 0 ? (
        <p className="text-text-tertiary px-3 py-6 text-center text-[12px]">{t('empty')}</p>
      ) : (
        <ul>
          {battles.map((b, i) => (
            <Row key={`${b.battleTime}:${i}`} battle={b} locale={locale} />
          ))}
        </ul>
      )}
    </section>
  )
}
