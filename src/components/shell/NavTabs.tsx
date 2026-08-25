'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { TABS } from './tabs'

export function NavTabs({ locale, className = '' }: { locale: string; className?: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  return (
    <nav className={`items-center gap-5 ${className}`}>
      {TABS.map(tab => {
        const href = `/${locale}${tab.href}`
        const active = pathname === href
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`text-[13px] font-semibold transition-colors ${
              active ? 'text-brand' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {t(tab.key)}
          </Link>
        )
      })}
    </nav>
  )
}
