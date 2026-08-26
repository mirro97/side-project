'use client'
import { useState } from 'react'
import type { Ability, Gear, Locale } from '@/types/game'

export type AbilityKind = 'star-powers' | 'gadgets' | 'gears'

/**
 * 세 종류 모두 regular 를 쓴다.
 *
 * borderless 변형은 신규 브롤러의 능력에 존재하지 않는다.
 * 스타파워·가젯 424개를 전수 확인하니 borderless 는 36개가 404 였고 regular 는 전부 200 이었다.
 * 기본 정렬이 최신순이라 첫 카드를 열면 바로 이 문제를 만난다.
 */
function iconUrl(kind: AbilityKind, id: number): string {
  return `https://cdn.brawlify.com/${kind}/regular/${id}.png`
}

/** 기어 수치를 사람이 읽는 형태로 (예: +15%) */
function formatModifier(m: Gear['modifier']): string | null {
  if (!m) return null
  if (m.type === 'percent') return `+${m.value}%`
  if (m.type === 'value') return `+${m.value}`
  return null
}

export function AbilityItem({
  kind,
  ability,
  locale,
}: {
  kind: AbilityKind
  ability: Ability | Gear
  locale: Locale
}) {
  // 게임 업데이트 직후에는 CDN 에 아직 없는 능력이 생긴다.
  // 빈 칸으로 두면 레이아웃이 어긋나 보이므로 자리를 유지한 채 표시만 감춘다
  const [broken, setBroken] = useState(false)
  const modifier = 'modifier' in ability ? formatModifier(ability.modifier) : null
  const description = ability.description?.[locale]

  return (
    <div className="bg-bg-surface rounded-chip flex items-start gap-2.5 px-2.5 py-2">
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center">
        {broken ? (
          <span className="bg-border-strong h-2 w-2 rounded-full" aria-hidden />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={iconUrl(kind, ability.id)}
            alt=""
            width={26}
            height={26}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-[26px] w-[26px]"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[11px] font-semibold">{ability.name[locale]}</span>
          {modifier && (
            <span className="text-brand-hover shrink-0 text-[10px] font-bold">{modifier}</span>
          )}
        </div>
        {description && (
          <p className="text-text-tertiary mt-0.5 text-[10px] leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  )
}
