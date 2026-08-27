import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { ProfileView } from '@/components/profile/ProfileView'
import type { Locale } from '@/types/game'

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

/**
 * 조회 대상은 ?tag= 와 로컬스토리지에 있어 서버가 그릴 게 없다.
 * 정적 셸만 내보내고 조회는 전부 클라이언트가 한다 — 추천 페이지와 같은 구조다.
 */
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Suspense fallback={null}>
      <ProfileView locale={locale as Locale} />
    </Suspense>
  )
}
