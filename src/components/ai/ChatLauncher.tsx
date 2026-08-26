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
  // 브롤러 상세가 열려 있으면 그 브롤러를 질문 맥락에 싣는다
  const brawlerId = useSearchParams().get('brawler')
  const focus = brawlerId ? (getBrawler(Number(brawlerId)) ?? null) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('open')}
        className="bg-brand fixed right-4 bottom-24 z-30 flex h-12 w-12 items-center justify-center rounded-full text-[20px] shadow-lg md:bottom-6"
      >
        <span aria-hidden>✦</span>
      </button>

      <DetailPanel open={open} onClose={() => setOpen(false)} title={t('title')}>
        <ChatPanel locale={locale} focus={focus} />
      </DetailPanel>
    </>
  )
}
