import { useTranslations } from 'next-intl'

/** 슈퍼셀 팬 콘텐츠 정책상 필수다. 빠뜨리면 안 된다 */
export function FanContentFooter() {
  const t = useTranslations('footer')
  return (
    <footer className="text-text-tertiary px-4 py-6 text-center text-[11px] leading-relaxed">
      <p>{t('disclaimer')}</p>
      <a
        href="https://www.supercell.com/fan-content-policy"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Supercell Fan Content Policy
      </a>
    </footer>
  )
}
