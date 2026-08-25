'use client'
import { useCallback, useSyncExternalStore } from 'react'

/**
 * matchMedia 구독.
 * useEffect + setState 로 만들면 초기값을 동기 setState 로 넣게 돼
 * 캐스케이딩 렌더가 생긴다. useSyncExternalStore 가 이 용도로 만들어졌다.
 * 서버 스냅샷은 항상 false 라 SSR 은 모바일 레이아웃으로 그려진다.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
