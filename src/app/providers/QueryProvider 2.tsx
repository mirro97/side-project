'use client'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * 클라이언트 데이터 페칭용. 개인 데이터(대표 계정)만 여기를 탄다.
 * 공유 데이터는 서버 컴포넌트에서 직접 가져오므로 이 프로바이더와 무관하다.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // 요청마다 클라이언트를 새로 만들면 캐시가 날아가므로 상태로 한 번만 생성한다
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 프록시 경유가 약 500ms 라 같은 태그를 반복 조회하지 않게 한다
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
