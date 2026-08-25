'use client'
import { useTranslations } from 'next-intl'
import type { RoleKey } from '@/types/game'

/** 역할 데이터가 없는 브롤러가 19종이다. 그 경우 아무것도 렌더하지 않는다 */
export function RoleBadge({ role }: { role: RoleKey | null }) {
  const t = useTranslations('role')
  if (!role) return null
  return (
    <span className="border-border-subtle bg-bg-surface text-text-secondary rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold">
      {t(role)}
    </span>
  )
}
