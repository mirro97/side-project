import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getEventsRotationApi, getRankingsClubsApi, getRankingsPlayersApi } from '@/lib/bs/api'
import { sortByEndingSoon } from '@/lib/home'
import { parseBrawlTime } from '@/lib/bs/parse'
import { getMode, modeLabel } from '@/lib/game-data'
import { BsError, type BsErrorKind } from '@/lib/bs/errors'
import { SectionCard } from '@/components/home/SectionCard'
import { EventRow } from '@/components/home/EventRow'
import { MyAccountCard } from '@/components/home/MyAccountCard'
import { RankRow } from '@/components/rank/RankRow'
import { ErrorState } from '@/components/state/ErrorState'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/types/game'

/**
 * 모든 방문자에게 동일한 데이터라 10분 캐시가 먹는다.
 * generateStaticParams 가 없으면 라우트가 Dynamic 으로 잡혀 revalidate 가 무시된다.
 */
export const revalidate = 600

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

function kindOf(e: unknown): BsErrorKind {
  return e instanceof BsError ? e.kind : 'Unknown'
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  // 정적 렌더링을 위해 반드시 먼저 부른다
  setRequestLocale(locale)
  const l = locale as Locale
  const t = await getTranslations('home')
  const tc = await getTranslations('common')

  // 프록시 경유가 약 500ms 다. 순차로 부르면 1.5초가 되므로 반드시 병렬이어야 한다.
  // all 이 아니라 allSettled 인 이유는 한 조각이 실패해도 나머지 섹션을 보여주기 위해서다.
  const [players, clubs, events] = await Promise.allSettled([
    getRankingsPlayersApi('global', 5),
    getRankingsClubsApi('global', 5),
    getEventsRotationApi(),
  ])

  return (
    <>
      <SectionCard title={t('myAccount')}>
        <MyAccountCard locale={l} />
      </SectionCard>

      <SectionCard title={t('userRanking')} moreHref={`/${l}/ranking`} moreLabel={tc('seeAll')}>
        {players.status === 'fulfilled' ? (
          players.value.items.map(p => (
            <RankRow
              key={p.tag}
              rank={p.rank}
              name={p.name}
              nameColor={p.nameColor}
              trophies={p.trophies}
              iconUrl={`https://cdn.brawlify.com/profile-icons/regular/${p.icon.id}.png`}
              subtitle={p.club?.name}
            />
          ))
        ) : (
          <ErrorState kind={kindOf(players.reason)} />
        )}
      </SectionCard>

      <SectionCard title={t('clubRanking')} moreHref={`/${l}/ranking`} moreLabel={tc('seeAll')}>
        {clubs.status === 'fulfilled' ? (
          clubs.value.items.map(c => (
            <RankRow
              key={c.tag}
              rank={c.rank}
              name={c.name}
              trophies={c.trophies}
              iconUrl={`https://cdn.brawlify.com/club-badges/regular/${c.badgeId}.png`}
              subtitle={`${c.memberCount}/30`}
            />
          ))
        ) : (
          <ErrorState kind={kindOf(clubs.reason)} />
        )}
      </SectionCard>

      <SectionCard title={t('liveEvents')} moreHref={`/${l}/events`} moreLabel={tc('seeAll')}>
        {events.status === 'fulfilled' ? (
          sortByEndingSoon(events.value)
            .slice(0, 5)
            .map(e => {
              const mode = getMode(e.event.modeId)
              const end = parseBrawlTime(e.endTime)
              if (!end) return null
              return (
                <EventRow
                  key={e.slotId}
                  modeName={modeLabel(e.event.mode, l)}
                  mapName={e.event.map}
                  // 48000000 오프셋이 붙은 imageId 를 써야 한다. modeId 를 그대로 넣으면 404
                  iconUrl={
                    mode ? `https://cdn.brawlify.com/game-modes/regular/${mode.imageId}.png` : null
                  }
                  end={end}
                />
              )
            })
        ) : (
          <ErrorState kind={kindOf(events.reason)} />
        )}
      </SectionCard>
    </>
  )
}
