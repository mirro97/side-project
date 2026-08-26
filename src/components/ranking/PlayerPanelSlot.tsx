'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlayerPanel } from './PlayerPanel'
import type { Locale } from '@/types/game'

/**
 * useSearchParams 는 정적 렌더링을 클라이언트로 밀어낸다(BAILOUT_TO_CLIENT_SIDE_RENDERING).
 * 목록까지 함께 끌려가지 않도록 패널만 이 컴포넌트로 분리해 Suspense 로 감싼다.
 * 브롤러 상세와 같은 구조다.
 */
export function PlayerPanelSlot({ locale }: { locale: Locale }) {
  const router = useRouter()
  const tag = useSearchParams().get('player')

  return (
    <PlayerPanel
      tag={tag}
      locale={locale}
      // push 라야 뒤로 가기로 패널이 닫힌다
      onClose={() => router.push('?', { scroll: false })}
    />
  )
}
