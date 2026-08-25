'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname()
  const next = locale === 'en' ? 'ko' : 'en'
  const href = pathname.replace(new RegExp(`^/${locale}`), `/${next}`)
  return (
    <Link
      href={href}
      className="border-border-strong text-text-secondary rounded-full border px-2 py-0.5 text-[11px] font-semibold"
    >
      {next.toUpperCase()}
    </Link>
  )
}
