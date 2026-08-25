import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('nav')
  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">{t('home')}</h1>
      <p className="text-text-secondary mt-2">317,958</p>
    </main>
  )
}
