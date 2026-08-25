'use client'
import { useTranslations } from 'next-intl'
import { RankBadge } from '@/components/display/RankBadge'
import { TrophyValue } from '@/components/display/TrophyValue'
import { argbToHex, stripNameMarkup } from '@/lib/format'

export interface RankRowProps {
  rank: number
  name: string
  trophies: number
  iconUrl: string
  /** 플레이어는 클럽명, 클럽은 멤버 수 */
  subtitle?: string
  /** 플레이어만 내려온다. 0xffcb5aff 형태의 ARGB */
  nameColor?: string
  isMe?: boolean
  onClick?: () => void
}

export function RankRow({
  rank,
  name,
  trophies,
  iconUrl,
  subtitle,
  nameColor,
  isMe,
  onClick,
}: RankRowProps) {
  const t = useTranslations('common')
  const color = nameColor ? argbToHex(nameColor) : null

  return (
    <div
      onClick={onClick}
      className={`border-border-subtle flex items-center gap-2.5 border-b px-3 py-2.5 last:border-b-0 ${
        onClick ? 'cursor-pointer' : ''
      } ${isMe ? 'bg-brand/15 rounded-card ring-brand ring-1' : ''}`}
    >
      <RankBadge rank={rank} />
      {/* CDN 이미지는 next/image 최적화를 태우지 않는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl}
        alt=""
        width={28}
        height={28}
        className="bg-bg-elevated rounded-chip h-7 w-7 shrink-0 object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold" style={color ? { color } : undefined}>
            {stripNameMarkup(name)}
          </span>
          {isMe && (
            <span className="bg-brand shrink-0 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white">
              {t('myAccount')}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="text-text-tertiary truncate text-[11px]">{stripNameMarkup(subtitle)}</div>
        )}
      </div>
      <TrophyValue value={trophies} />
    </div>
  )
}
