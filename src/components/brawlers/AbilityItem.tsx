import type { Ability } from '@/types/game'

export type AbilityKind = 'star-powers' | 'gadgets' | 'gears'

/**
 * 기어는 borderless 경로가 없다. regular 만 존재한다.
 * 스타파워·가젯은 borderless 를 쓴다.
 */
function iconUrl(kind: AbilityKind, id: number): string {
  const variant = kind === 'gears' ? 'regular' : 'borderless'
  return `https://cdn.brawlify.com/${kind}/${variant}/${id}.png`
}

export function AbilityItem({ kind, ability }: { kind: AbilityKind; ability: Ability }) {
  return (
    <div className="bg-bg-surface rounded-chip flex items-center gap-2.5 px-2.5 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl(kind, ability.id)}
        alt=""
        width={26}
        height={26}
        loading="lazy"
        className="h-[26px] w-[26px] shrink-0"
      />
      <span className="truncate text-[11px] font-semibold">{ability.name}</span>
    </div>
  )
}
