'use client'
import { useCallback, useMemo, useState } from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getBrawlers } from '@/lib/game-data'
import { countByRarity, countByRole, filterBrawlers, sortBrawlers, type SortKey } from '@/lib/brawlers'
import { useMainAccount } from '@/hooks/useMainAccount'
import { usePlayer } from '@/hooks/usePlayer'
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
import { RarityFilter, type RarityOption } from './RarityFilter'
import type { PlayerBrawler } from '@/types/api'
import type { Locale, RoleKey } from '@/types/game'

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
/** 희귀도 id → 번역 키. 등급 순서(오름차순) 그대로 나열한다 */
const RARITIES: { id: number; slug: string }[] = [
  { id: 1, slug: 'common' },
  { id: 2, slug: 'rare' },
  { id: 3, slug: 'superRare' },
  { id: 4, slug: 'epic' },
  { id: 5, slug: 'mythic' },
  { id: 6, slug: 'legendary' },
  { id: 7, slug: 'ultraLegendary' },
]

export function BrawlerBrowser({ locale }: { locale: Locale }) {
  const t = useTranslations('brawlers')
  const tr = useTranslations('role')
  const trr = useTranslations('rarity')
  const router = useRouter()
  const { mainAccountTag } = useMainAccount()

  const [query, setQuery] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [rarityIds, setRarityIds] = useState<Set<number>>(() => new Set())
  const [sort, setSort] = useState<SortKey>('released')

  const all = getBrawlers()
  const roleCounts = useMemo(() => countByRole(all), [all])
  const rarityCounts = useMemo(() => countByRarity(all), [all])
  // 등급 색은 데이터에서 온다 — 브랜드 컬러를 따로 하드코딩하지 않는다
  const rarityColors = useMemo(() => {
    const map = new Map<number, string>()
    for (const b of all) if (!map.has(b.rarity.id)) map.set(b.rarity.id, b.rarity.color)
    return map
  }, [all])

  // 대표 계정이 있을 때만 진행도를 얹는다
  const { player } = usePlayer(mainAccountTag)
  const owned = useMemo((): Map<number, PlayerBrawler> | null => {
    if (!player) return null
    return new Map(player.brawlers.map(b => [b.id, b]))
  }, [player])

  // 브롤러는 전부 번들 데이터라 서버 호출 없이 필터+정렬만 하면 된다.
  // 예전엔 이 결과를 30개씩 잘라 더보기 방식으로 냈는데, 그 페이지네이션 상태 리셋이
  // setState 직후 동기 호출돼 리렌더 전 낡은 클로저를 참조해 검색/필터가 한 스텝씩 밀렸다.
  // 데이터 규모가 크지 않으니 페이지네이션 자체를 없애고 전부 그린다
  const visible = useMemo(
    () =>
      sortBrawlers(
        filterBrawlers(all, {
          query,
          role: (role as RoleKey | null) ?? null,
          rarityIds: Array.from(rarityIds),
        }),
        sort,
        locale,
      ),
    [all, query, role, rarityIds, sort, locale],
  )

  const roleOptions: ChipOption[] = ROLES.filter(r => roleCounts[r]).map(r => ({
    key: r,
    label: tr(r),
    count: roleCounts[r],
  }))

  const rarityOptions: RarityOption[] = RARITIES.filter(({ id }) => rarityCounts[id]).map(
    ({ id, slug }) => ({
      id,
      label: trr(slug),
      color: rarityColors.get(id) ?? '#999',
      count: rarityCounts[id],
    }),
  )

  const handleToggleRarity = (id: number) => {
    setRarityIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // id 하나로 고정된 참조를 유지한다 — 카드마다 새 클로저를 만들면 검색 키 입력마다
  // ~100개 카드 전부가 새 onSelect 를 받아 memo 없이 전부 리렌더된다
  const handleSelectBrawler = useCallback(
    (id: number) => router.push(`?brawler=${id}`, { scroll: false }),
    [router],
  )

  return (
    <>
      <div className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="border-border-strong bg-bg-surface rounded-card min-w-0 flex-1 px-3 py-2 text-[13px] outline-none"
        />
        {/*
          네이티브 select 는 팝업 위치를 브라우저와 OS 가 정해서 트리거와 어긋나고
          다크 테마 스타일도 먹지 않는다. shadcn Select 는 트리거에 앵커링된다.
        */}
        <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
          <SelectTrigger
            aria-label={t('sortReleased')}
            className="border-border-strong bg-bg-surface rounded-card text-text-secondary w-auto shrink-0 text-[12px] font-semibold"
          >
            <SelectValue />
          </SelectTrigger>
          {/*
            기본값 "item-aligned" 는 선택된 항목을 트리거 위치에 맞춰 팝업을 띄워서
            옵션을 바꿀 때마다 위치가 흔들린다. "popper" 로 항상 트리거 하단에 고정한다
          */}
          <SelectContent position="popper" sideOffset={4}>
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
        onSelect={k => setRole(k)}
      />

      <RarityFilter options={rarityOptions} selected={rarityIds} onToggle={handleToggleRarity} />

      {visible.length === 0 ? (
        <EmptyState
          message={t('noResult')}
          action={
            <button
              onClick={() => {
                setQuery('')
                setRole(null)
                setRarityIds(new Set())
              }}
              className="border-border-strong rounded-card text-brand-hover border px-3 py-1.5 text-[12px] font-semibold"
            >
              {t('resetFilter')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {visible.map(b => {
            const p = owned?.get(b.id)
            return (
              <BrawlerCard
                key={b.id}
                brawler={b}
                locale={locale}
                progress={p ? { power: p.power, trophies: p.trophies } : undefined}
                locked={Boolean(owned) && !p}
                onSelect={handleSelectBrawler}
              />
            )
          })}
        </div>
      )}

      <Suspense fallback={null}>
        <BrawlerDetailSlot locale={locale} />
      </Suspense>
    </>
  )
}
