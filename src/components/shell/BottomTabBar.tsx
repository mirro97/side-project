'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { TABS } from './tabs'

export function BottomTabBar({ locale, className = '' }: { locale: string; className?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  return (
    <nav
      className={`border-border-subtle bg-bg-base/95 fixed inset-x-0 bottom-0 z-20 flex border-t pb-3 pt-2 backdrop-blur ${className}`}
    >
      {TABS.map(tab => {
        const href = `/${locale}${tab.href}`
        const active = pathname === href
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 text-center text-[10px] font-medium ${
              active ? 'text-brand' : 'text-text-tertiary'
            }`}
          >
            {t(tab.key)}
          </Link>
        )
      })}
    </nav>
  )
}
