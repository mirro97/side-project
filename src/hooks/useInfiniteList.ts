'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Page<T> {
  items: T[]
  nextCursor?: string
}
export type Loader<T> = (cursor?: string) => Promise<Page<T>>

/**
 * 랭킹은 서버 커서, 브롤러는 로컬 배열 슬라이스로 같은 훅을 쓴다.
 * 커서가 없으면 끝이다 — 랭킹은 200위에서 paging.cursors 가 빈 객체로 온다.
 */
export function useInfiniteList<T>(load: Loader<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const cursor = useRef<string | undefined>(undefined)
  const done = useRef(false)
  // loading 을 의존성에 넣으면 콜백이 매번 새로 생겨 무한 루프가 난다
  const busy = useRef(false)
  const loadRef = useRef(load)
  loadRef.current = load

  const fetchPage = useCallback(async (fresh: boolean) => {
    if (busy.current || (!fresh && done.current)) return
    busy.current = true
    setLoading(true)
    setError(null)
    try {
      const page = await loadRef.current(fresh ? undefined : cursor.current)
      cursor.current = page.nextCursor
      done.current = !page.nextCursor
      setItems(prev => (fresh ? page.items : [...prev, ...page.items]))
    } catch (e) {
      setError(e)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [])

  const reset = useCallback(async () => {
    cursor.current = undefined
    done.current = false
    await fetchPage(true)
  }, [fetchPage])

  const loadMore = useCallback(() => fetchPage(false), [fetchPage])

  useEffect(() => {
    void fetchPage(true)
  }, [fetchPage])

  return { items, loading, error, hasMore: !done.current, loadMore, reset }
}
