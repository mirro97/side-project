import { Suspense } from 'react'
import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/types/game'
import { AppShell } from '@/components/shell/AppShell'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { ChatLauncher } from '@/components/ai/ChatLauncher'
// 동적 서브셋 CSS. unicode-range 로 필요한 글리프 파일만 내려받는다.
// complete(1.2MB) 대신 split 을 쓰면 영문 페이지에서 117KB 만 받는다.
import 'wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Brawl Companion',
  description: 'Brawl Stars companion — profile, brawlers, ranking, events, recommendations',
}

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
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
  // 이걸 부르지 않으면 next-intl 이 헤더를 읽어 라우트가 Dynamic 으로 빠진다
  setRequestLocale(locale)
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <QueryProvider>
            <AppShell locale={locale}>{children}</AppShell>
            {/*
              useSearchParams 를 쓰므로 반드시 Suspense 로 감싼다.
              안 감싸면 앱 전체의 정적 렌더링이 클라이언트로 밀린다.
            */}
            <Suspense fallback={null}>
              <ChatLauncher locale={locale as Locale} />
            </Suspense>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
