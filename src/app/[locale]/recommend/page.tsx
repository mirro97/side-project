import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { RecommendView } from '@/components/recommend/RecommendView'
import type { Locale } from '@/types/game'

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

/**
 * 설문 답과 대표 계정이 로컬스토리지에 있어 서버가 그릴 결과가 없다.
 * 정적 셸만 내보내고 계산은 클라이언트가 한다 — 조회할 데이터가 없어 revalidate 도 없다.
 */
export default async function RecommendPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <RecommendView locale={locale as Locale} />
}
