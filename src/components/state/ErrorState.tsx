'use client'
import { useTranslations } from 'next-intl'
import type { BsErrorKind } from '@/lib/bs/errors'

/**
 * Maintenance 와 NotFound 만 전용 문구를 갖는다.
 * 403 은 키·IP 문제라 운영 이슈이므로 사용자에게는 일반 오류로 보인다.
 */
export function ErrorState({ kind, onRetry }: { kind: BsErrorKind; onRetry?: () => void }) {
  const t = useTranslations()
  const message =
    kind === 'Maintenance'
      ? t('error.maintenance')
      : kind === 'NotFound'
        ? t('error.notFound')
        : t('error.generic')

  return (
    <div className="border-border-subtle bg-bg-surface rounded-panel flex flex-col items-center gap-3 border px-6 py-10 text-center">
      <p className="text-text-secondary text-[13px]">{message}</p>
      {onRetry && kind !== 'NotFound' && (
        <button
          onClick={onRetry}
          className="border-border-strong text-brand-hover rounded-card border px-3 py-1.5 text-[12px] font-semibold"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
