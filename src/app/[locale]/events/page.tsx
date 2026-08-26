import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { getEventsRotationApi } from '@/lib/bs/api'
import { BsError, type BsErrorKind } from '@/lib/bs/errors'
import { toEventViews } from '@/lib/events'
import { EventBrowser } from '@/components/events/EventBrowser'
import { ErrorState } from '@/components/state/ErrorState'
import type { Locale } from '@/types/game'

/**
 * 로테이션은 시간 단위로 바뀐다. 설계서의 캐시 경계대로 30분.
 * generateStaticParams 가 없으면 라우트가 Dynamic 으로 잡혀 revalidate 가 무시된다.
 */
export const revalidate = 1800

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  let views
  let error: BsErrorKind | undefined
  try {
    views = toEventViews(await getEventsRotationApi())
  } catch (e) {
    error = e instanceof BsError ? e.kind : 'Unknown'
  }

  if (!views) {
    return (
      <div className="px-3 py-4">
        <ErrorState kind={error ?? 'Unknown'} />
      </div>
    )
  }
  return <EventBrowser initial={views} locale={locale as Locale} />
}
