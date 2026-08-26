import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { getRankingsPlayersApi } from '@/lib/bs/api'
import { BsError, type BsErrorKind } from '@/lib/bs/errors'
import { DEFAULT_COUNTRY, PAGE_SIZE, nextCursorOf, toPlayerRow } from '@/lib/ranking'
import { RankingBrowser } from '@/components/ranking/RankingBrowser'
import type { Locale } from '@/types/game'

/**
 * 모든 방문자에게 동일한 데이터라 10분 캐시가 먹는다.
 * generateStaticParams 가 없으면 라우트가 Dynamic 으로 잡혀 revalidate 가 무시된다.
 */
export const revalidate = 600

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function RankingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  /**
   * 기본 조합(글로벌 · 플레이어)의 첫 페이지만 서버에서 가져온다.
   * searchParams 를 읽으면 라우트가 Dynamic 이 되어 캐시가 죽는다.
   * 다른 조합은 클라이언트가 /api/ranking 으로 받아온다.
   */
  let initial
  let initialError: BsErrorKind | undefined
  try {
    const page = await getRankingsPlayersApi(DEFAULT_COUNTRY, PAGE_SIZE)
    initial = { items: page.items.map(toPlayerRow), nextCursor: nextCursorOf(page) }
  } catch (e) {
    // 실패해도 페이지는 그린다. 탭·국가는 여전히 쓸 수 있다
    initialError = e instanceof BsError ? e.kind : 'Unknown'
  }

  // Suspense 는 RankingBrowser 안쪽에서 패널만 감싼다.
  // 여기서 통째로 감싸면 목록까지 바깥으로 밀려 서버 렌더가 버려진다
  return <RankingBrowser locale={locale as Locale} initial={initial} initialError={initialError} />
}
