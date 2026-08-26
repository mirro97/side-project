'use client'
import { useCallback, useMemo, useState } from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { getBrawlers } from '@/lib/game-data'
import { countByRole, filterBrawlers, sortBrawlers, type SortKey } from '@/lib/brawlers'
import { useMainAccount } from '@/hooks/useMainAccount'
import { useInfiniteList } from '@/hooks/useInfiniteList'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/state/EmptyState'
import { BrawlerCard } from './BrawlerCard'
import { BrawlerDetailSlot } from './BrawlerDetailSlot'
import { FilterChips, type ChipOption } from './FilterChips'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { Player, PlayerBrawler } from '@/types/api'
import type { Brawler, Locale, RoleKey } from '@/types/game'

const PAGE = 30
const ROLES: RoleKey[] = [
  'damage',
  'tank',
  'assassin',
  'support',
  'controller',
  'marksman',
  'artillery',
]
/** 정렬 키와 문구 키를 한 곳에 묶는다. 렌더에서 삼항으로 고르면 키를 놓치기 쉽다 */
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'released', label: 'sortReleased' },
  { key: 'name', label: 'sortName' },
  { key: 'rarity', label: 'sortRarity' },
]

interface PlayerResult {
  ok: boolean
  data?: Player
  kind?: BsErrorKind
}

async function fetchPlayer(tag: string): Promise<PlayerResult> {
  const res = await fetch(`/api/player/${encodeURIComponent(tag)}`)
  return (await res.json()) as PlayerResult
}

export function BrawlerBrowser({ locale }: { locale: Locale }) {
  const t = useTranslations('brawlers')
  const tr = useTranslations('role')
  const router = useRouter()
  const { mainAccountTag } = useMainAccount()

  const [query, setQuery] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('released')

  const all = getBrawlers()
  const roleCounts = useMemo(() => countByRole(all), [all])

  // 대표 계정이 있을 때만 진행도를 얹는다
  const { data: playerData } = useQuery({
    queryKey: ['player', mainAccountTag],
    queryFn: () => fetchPlayer(mainAccountTag as string),
    enabled: Boolean(mainAccountTag),
  })
  const owned = useMemo((): Map<number, PlayerBrawler> | null => {
    const p = playerData?.ok ? playerData.data : undefined
    if (!p) return null
    return new Map(p.brawlers.map(b => [b.id, b]))
  }, [playerData])

  const visible = useMemo(
    () =>
      sortBrawlers(
        filterBrawlers(all, { query, role: (role as RoleKey | null) ?? null }),
        sort,
        locale,
      ),
    [all, query, role, sort, locale],
  )

  // 로컬 배열을 오프셋으로 슬라이스한다. 서버 호출이 아니다
  const loader = useCallback(
    (cursor?: string) => {
      const start = cursor ? Number(cursor) : 0
      const next = start + PAGE
      return Promise.resolve({
        items: visible.slice(start, next),
        nextCursor: next < visible.length ? String(next) : undefined,
      })
    },
    [visible],
  )
  // 브롤러 데이터는 전부 번들이라 서버에서도 첫 페이지를 그릴 수 있다.
  // 초기 페이지를 주지 않으면 SSR 결과가 빈 그리드가 된다
  const initial = useMemo(
    () => ({
      items: visible.slice(0, PAGE),
      nextCursor: PAGE < visible.length ? String(PAGE) : undefined,
    }),
    // 최초 상태로만 쓰인다. 이후 변경은 reset() 이 처리한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const { items, hasMore, loadMore, reset } = useInfiniteList<Brawler>(loader, initial)

  // 필터가 바뀌면 렌더 개수를 초기화한다
  const applyFilter = (fn: () => void) => {
    fn()
    void reset()
  }

  const roleOptions: ChipOption[] = ROLES.filter(r => roleCounts[r]).map(r => ({
    key: r,
    label: tr(r),
    count: roleCounts[r],
  }))

  return (
    <>
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={e => applyFilter(() => setQuery(e.target.value))}
          placeholder={t('searchPlaceholder')}
          className="border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 px-3 py-2 text-[13px] outline-none"
        />
        {/*
          네이티브 select 는 팝업 위치를 브라우저와 OS 가 정해서 트리거와 어긋나고
          다크 테마 스타일도 먹지 않는다. shadcn Select 는 트리거에 앵커링된다.
        */}
        <Select value={sort} onValueChange={v => applyFilter(() => setSort(v as SortKey))}>
          <SelectTrigger
            aria-label={t('sortReleased')}
            className="border-border-strong bg-bg-surface rounded-card text-text-secondary w-auto shrink-0 text-[12px] font-semibold"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(o => (
              <SelectItem key={o.key} value={o.key} className="text-[12px]">
                {t(o.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FilterChips
        options={roleOptions}
        selected={role}
        allLabel={t('all')}
        allCount={all.length}
        onSelect={k => applyFilter(() => setRole(k))}
      />

      {items.length === 0 ? (
        <EmptyState
          message={t('noResult')}
          action={
            <button
              onClick={() =>
                applyFilter(() => {
                  setQuery('')
                  setRole(null)
                })
              }
              className="border-border-strong rounded-card text-brand-hover border px-3 py-1.5 text-[12px] font-semibold"
            >
              {t('resetFilter')}
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {items.map(b => {
              const p = owned?.get(b.id)
              return (
                <BrawlerCard
                  key={b.id}
                  brawler={b}
                  locale={locale}
                  progress={p ? { power: p.power, trophies: p.trophies } : undefined}
                  locked={Boolean(owned) && !p}
                  onSelect={() => router.push(`?brawler=${b.id}`, { scroll: false })}
                />
              )
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => void loadMore()}
              className="border-border-strong text-text-secondary rounded-card mt-4 w-full border py-2.5 text-[12px] font-semibold"
            >
              +{Math.min(PAGE, visible.length - items.length)}
            </button>
          )}
        </>
      )}

      <Suspense fallback={null}>
        <BrawlerDetailSlot locale={locale} />
      </Suspense>
    </>
  )
}
