'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { getBrawler } from '@/lib/game-data'
import { ChatPanel } from './ChatPanel'
import type { Locale } from '@/types/game'

/**
 * 어느 페이지에서든 열리는 떠 있는 버튼.
 *
 * 탭으로 넣지 않은 이유는 tabs.ts 에 적혀 있다 — 모바일 하단 탭바가 5개 상한이다.
 * 떠 있는 버튼이 오히려 맞다: 브롤러 상세를 보다가 그 자리에서 물어볼 수 있다.
 *
 * useSearchParams 를 쓰므로 layout 에서 Suspense 로 감싼다.
 * 감싸지 않으면 앱 전체의 정적 렌더링이 클라이언트로 밀린다.
 */
export function ChatLauncher({ locale }: { locale: Locale }) {
  const t = useTranslations('ai')
  const [open, setOpen] = useState(false)
  /**
   * 검색 그라운딩이 막혔다는 사실은 패널보다 오래 살아야 한다.
   * ChatPanel 은 패널을 닫으면 언마운트되므로 거기 두면 다시 열 때마다
   * 실패할 게 뻔한 호출을 또 보낸다. 런처는 레이아웃에 있어 계속 떠 있다.
   */
  const [searchBlocked, setSearchBlocked] = useState(false)
  // 브롤러 상세가 열려 있으면 그 브롤러를 질문 맥락에 싣는다
  const brawlerId = useSearchParams().get('brawler')
  const focus = brawlerId ? (getBrawler(Number(brawlerId)) ?? null) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('open')}
        /* 아이콘과 라벨을 세로로 쌓으면 둘 다 자리가 없다. 가로로 눕히고
           별은 반투명 원 안에 넣어 엠블럼처럼 세운다.
           그림자는 쓰지 않는다 — 브랜드색 글로우가 번져 보였다. 경계는 링으로만 준다 */
        className="from-brand-hover to-brand fixed right-4 bottom-24 z-30 flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br py-2 pr-4 pl-2 ring-1 ring-white/15 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 md:bottom-6"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[15px] leading-none text-white"
        >
          ✦
        </span>
        {/* shimmer 는 background-clip:text 라 바탕이 될 글자색을 낮은 불투명도로 준다 */}
        <span className="shimmer shimmer-color-white shimmer-spread-200 text-[12px] leading-none font-bold text-white/70">
          {t('launcher')}
        </span>
      </button>

      <DetailPanel open={open} onClose={() => setOpen(false)} title={t('title')}>
        <ChatPanel
          locale={locale}
          focus={focus}
          searchBlocked={searchBlocked}
          onSearchBlocked={() => setSearchBlocked(true)}
        />
      </DetailPanel>
    </>
  )
}
