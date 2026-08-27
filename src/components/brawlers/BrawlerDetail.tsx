'use client'
import { useTranslations } from 'next-intl'
import { useGlitch } from 'react-powerglitch'
import { RarityBadge } from '@/components/display/RarityBadge'
import { RoleBadge } from '@/components/display/RoleBadge'
import { StatBar } from '@/components/display/StatBar'
import { getRanges } from '@/lib/game-data'
import { formatTrophies } from '@/lib/format'
import { AbilityItem, type AbilityKind } from './AbilityItem'
import type { BrawlerProgress } from './BrawlerCard'
import type { Ability, Brawler, Gear, Locale } from '@/types/game'

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-bg-surface rounded-chip flex-1 px-2 py-1.5 text-center">
      <b className={`block text-[13px] font-bold ${accent ? 'text-trophy' : ''}`}>{value}</b>
      <i className="text-text-tertiary mt-px block text-[9px] not-italic">{label}</i>
    </div>
  )
}

function Section({
  title,
  items,
  kind,
  locale,
}: {
  title: string
  items: (Ability | Gear)[]
  kind: AbilityKind
  locale: Locale
}) {
  if (items.length === 0) return null
  return (
    <div className="mt-3.5">
      <div className="text-text-tertiary mb-1.5 text-[10px] font-bold uppercase tracking-wider">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map(a => (
          <AbilityItem key={a.id} kind={kind} ability={a} locale={locale} />
        ))}
      </div>
    </div>
  )
}

export function BrawlerDetail({
  brawler,
  locale,
  progress,
}: {
  brawler: Brawler
  locale: Locale
  progress?: BrawlerProgress & { rank: number }
}) {
  const t = useTranslations('brawlers')
  const ranges = getRanges()
  // 상세 화면의 포트레이트에만 재미로 붙인다 — hover 할 때만 짧게 글리치, 평소엔 정적이라
  // 스탯을 읽는 데 방해되지 않는다. createContainers(기본값) 때문에 img 를 직접 ref 하지 않고
  // 감싸는 div 를 ref 한다 — 조건부 렌더링 대상이 아닌 고정 엘리먼트여야 한다
  const { ref: portraitRef } = useGlitch({ playMode: 'hover' })

  return (
    <div>
      <div className="mb-3.5 flex items-start gap-3">
        <div
          ref={portraitRef}
          className="bg-bg-surface rounded-card h-[84px] w-[84px] shrink-0 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brawler.images.portrait}
            alt=""
            width={84}
            height={84}
            className="h-[84px] w-[84px] object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-extrabold tracking-tight">{brawler.name[locale]}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <RarityBadge name={brawler.rarity.name} color={brawler.rarity.color} />
            <RoleBadge role={brawler.role} />
          </div>
          {progress && (
            <div className="mt-2 flex gap-1.5">
              <Stat label={t('myProgress')} value={formatTrophies(progress.trophies)} accent />
              <Stat label={t('power')} value={`P${progress.power}`} />
              <Stat label={t('rank')} value={String(progress.rank)} />
            </div>
          )}
        </div>
      </div>

      {brawler.description[locale] && (
        <p className="text-text-secondary mb-3.5 text-[12px] leading-relaxed">
          {brawler.description[locale]}
        </p>
      )}

      <StatBar label={t('health')} value={brawler.stats.hp} range={ranges.hp} />
      <StatBar label={t('speed')} value={brawler.stats.speed} range={ranges.speed} />
      {/* 사거리가 결측인 브롤러가 있다 (BOLT). 없으면 막대를 그리지 않는다 */}
      {brawler.stats.range !== null && (
        <StatBar label={t('range')} value={brawler.stats.range} range={ranges.range} />
      )}

      <Section
        title={t('starPowers')}
        items={brawler.starPowers}
        kind="star-powers"
        locale={locale}
      />
      <Section title={t('gadgets')} items={brawler.gadgets} kind="gadgets" locale={locale} />
      <Section title={t('gears')} items={brawler.gears} kind="gears" locale={locale} />
    </div>
  )
}
