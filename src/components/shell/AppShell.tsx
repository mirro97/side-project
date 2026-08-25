import { NavTabs } from './NavTabs'
import { BottomTabBar } from './BottomTabBar'
import { Avatar } from './Avatar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { FanContentFooter } from './FanContentFooter'

export function AppShell({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <header className="border-border-subtle bg-bg-base sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-[15px] font-extrabold tracking-tight">Brawl Companion</span>
          <NavTabs locale={locale} className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <Avatar locale={locale} />
        </div>
      </header>
      <main className="flex-1 px-4 pb-4 pt-4">{children}</main>
      {/* 모바일에서는 하단 탭바 높이만큼 띄운다 */}
      <div className="pb-20 md:pb-0">
        <FanContentFooter />
      </div>
      <BottomTabBar locale={locale} className="md:hidden" />
    </div>
  )
}
