import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { AppShell } from '@/components/shell/AppShell'
// 동적 서브셋 CSS. unicode-range 로 필요한 글리프 파일만 내려받는다.
// complete(1.2MB) 대신 split 을 쓰면 영문 페이지에서 117KB 만 받는다.
import 'wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Brawl Companion',
  description: 'Brawl Stars companion — profile, brawlers, ranking, events, recommendations',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <AppShell locale={locale}>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
