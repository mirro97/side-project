'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'

export function Avatar({ iconId, locale }: { iconId?: number; locale: string }) {
  const t = useTranslations('common')
  const nav = useTranslations('nav')
  const { mainAccountTag } = useMainAccount()

  if (!mainAccountTag) {
    return (
      <Link
        href={`/${locale}/profile`}
        className="border-border-strong text-text-secondary rounded-full border px-3 py-1 text-[11px] font-semibold"
      >
        {t('setAccount')}
      </Link>
    )
  }
  return (
    <Link href={`/${locale}/profile`} aria-label={nav('profile')}>
      {/* CDN 이미지는 next/image 최적화를 태우지 않는다. Hobby 월 5천 변환 한도를 지킨다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://cdn.brawlify.com/profile-icons/regular/${iconId ?? 28000000}.png`}
        alt=""
        width={30}
        height={30}
        className="border-brand bg-bg-elevated h-[30px] w-[30px] rounded-full border-2"
      />
    </Link>
  )
}
