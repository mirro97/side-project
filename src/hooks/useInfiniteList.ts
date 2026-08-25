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
 *
 * initial 을 주면 서버 렌더 결과를 그대로 첫 상태로 쓴다.
 * 브롤러는 번들 데이터의 첫 슬라이스를, 랭킹은 서버가 받아온 첫 페이지를 넘긴다.
 *
 * ref 와 state 를 나눠 쓰는 이유:
 *   렌더에 쓰이는 값(hasMore)은 state 여야 목록이 끝났을 때 UI 가 갱신된다.
 *   비동기 콜백 안에서만 읽는 제어값(doneRef, busyRef)은 ref 로 둔다.
 */
export function useInfiniteList<T>(load: Loader<T>, initial?: Page<T>) {
  const [items, setItems] = useState<T[]>(initial?.items ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [hasMore, setHasMore] = useState(initial ? Boolean(initial.nextCursor) : true)

  const cursorRef = useRef<string | undefined>(initial?.nextCursor)
  const doneRef = useRef(initial ? !initial.nextCursor : false)
  const busyRef = useRef(false)
  // 초기 페이지를 받았으면 마운트 시 다시 부르지 않는다.
  // 서버가 이미 그린 목록을 클라이언트가 덮어쓰면 깜빡임이 생긴다
  const primedRef = useRef(Boolean(initial))
  const loadRef = useRef(load)

  // 렌더 중 ref 를 쓰지 않는다. 최신 loader 는 커밋 후에 갱신한다
  useEffect(() => {
    loadRef.current = load
  })

  const fetchPage = useCallback(async (fresh: boolean) => {
    if (busyRef.current || (!fresh && doneRef.current)) return
    busyRef.current = true
    setLoading(true)
    setError(null)
    try {
      const page = await loadRef.current(fresh ? undefined : cursorRef.current)
      cursorRef.current = page.nextCursor
      doneRef.current = !page.nextCursor
      setHasMore(Boolean(page.nextCursor))
      setItems(prev => (fresh ? page.items : [...prev, ...page.items]))
    } catch (e) {
      setError(e)
    } finally {
      busyRef.current = false
      setLoading(false)
    }
  }, [])

  const reset = useCallback(async () => {
    primedRef.current = false
    cursorRef.current = undefined
    doneRef.current = false
    setHasMore(true)
    await fetchPage(true)
  }, [fetchPage])

  const loadMore = useCallback(() => fetchPage(false), [fetchPage])

  useEffect(() => {
    if (primedRef.current) return
    void fetchPage(true)
  }, [fetchPage])

  return { items, loading, error, hasMore, loadMore, reset }
}
