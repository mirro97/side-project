'use client'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/state/ErrorState'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_KIND,
  RANKING_KINDS,
  type Country,
  type RankRowData,
  type RankingKind,
} from '@/lib/ranking'
import { RankingList } from './RankingList'
import { PlayerPanelSlot } from './PlayerPanelSlot'
import type { Page } from '@/hooks/useInfiniteList'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { Locale } from '@/types/game'

/**
 * 탭과 국가는 로컬 상태다. URL 에 두면 useSearchParams 가 필요하고,
 * 그러면 목록까지 클라이언트로 밀려나 서버가 그린 첫 페이지가 버려진다
 * (실측: URL 방식은 프리렌더 HTML 에 행이 0개, 스켈레톤만 남았다).
 * 브롤러 페이지의 필터와 같은 규칙이다.
 *
 * URL 에 두는 건 선택된 플레이어뿐이고, 그 부분만 Suspense 로 격리한다.
 */
export function RankingBrowser({
  locale,
  initial,
  initialError,
}: {
  locale: Locale
  /** 서버가 그린 기본값 첫 페이지 */
  initial?: Page<RankRowData>
  initialError?: BsErrorKind
}) {
  const t = useTranslations('ranking')
  // useRouter 는 정적 렌더링을 깨지 않는다. 바깥으로 미는 건 useSearchParams 뿐이다
  const router = useRouter()
  const [kind, setKind] = useState<RankingKind>(DEFAULT_KIND)
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY)

  // 서버가 그린 것과 같은 조합일 때만 첫 페이지를 물려준다.
  // 다르면 목록이 마운트되면서 스스로 가져온다
  const isDefault = kind === DEFAULT_KIND && country === DEFAULT_COUNTRY

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <h1 className="text-[17px] font-bold">{t('title')}</h1>

      <div className="flex items-center gap-2">
        <div className="border-border-subtle bg-bg-surface rounded-card flex flex-1 border p-0.5">
          {RANKING_KINDS.map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-chip flex-1 py-1.5 text-[12px] font-semibold transition-colors ${
                kind === k ? 'bg-brand text-white' : 'text-text-secondary'
              }`}
            >
              {k === 'players' ? t('tabPlayers') : t('tabClubs')}
            </button>
          ))}
        </div>

        <Select value={country} onValueChange={v => setCountry(v as Country)}>
          <SelectTrigger className="w-[110px]" aria-label={t('country')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c} value={c}>
                {c === 'global' ? t('global') : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isDefault && initialError ? (
        <ErrorState kind={initialError} />
      ) : (
        <RankingList
          // 조합이 바뀌면 이어붙이지 않고 새로 받는다
          key={`${kind}:${country}`}
          kind={kind}
          country={country}
          initial={isDefault ? initial : undefined}
          onSelect={tag => router.push(`?player=${encodeURIComponent(tag)}`, { scroll: false })}
        />
      )}

      <Suspense fallback={null}>
        <PlayerPanelSlot locale={locale} />
      </Suspense>
    </div>
  )
}
