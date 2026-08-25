import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { BrawlerBrowser } from '@/components/brawlers/BrawlerBrowser'
import type { Locale } from '@/types/game'

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function BrawlersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  // 그리드는 번들 데이터라 서버에서 그려진다.
  // useSearchParams 를 쓰는 상세 패널만 BrawlerBrowser 안쪽에서 Suspense 로 감싼다
  return <BrawlerBrowser locale={locale as Locale} />
}
