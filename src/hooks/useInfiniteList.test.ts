import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInfiniteList } from './useInfiniteList'

describe('useInfiniteList', () => {
  it('첫 페이지를 불러온다', async () => {
    const load = async () => ({ items: [1, 2, 3], nextCursor: 'c1' })
    const { result } = renderHook(() => useInfiniteList(load))
    await waitFor(() => expect(result.current.items).toEqual([1, 2, 3]))
    expect(result.current.hasMore).toBe(true)
  })

  it('다음 페이지를 이어 붙이고 커서가 비면 끝낸다', async () => {
    const pages = [
      { items: [1, 2], nextCursor: 'c1' },
      { items: [3, 4], nextCursor: undefined },
    ]
    let i = 0
    const load = async () => pages[i++]
    const { result } = renderHook(() => useInfiniteList(load))
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    await act(async () => { await result.current.loadMore() })
    expect(result.current.items).toEqual([1, 2, 3, 4])
    // 랭킹은 200위에서 paging.cursors 가 빈 객체로 온다
    expect(result.current.hasMore).toBe(false)
  })

  it('끝난 뒤 loadMore 를 더 불러도 다시 요청하지 않는다', async () => {
    let calls = 0
    const load = async () => { calls++; return { items: [calls], nextCursor: undefined } }
    const { result } = renderHook(() => useInfiniteList(load))
    await waitFor(() => expect(result.current.items).toEqual([1]))
    await act(async () => { await result.current.loadMore() })
    expect(calls).toBe(1)
  })

  it('reset 하면 처음부터 다시 불러온다', async () => {
    let calls = 0
    const load = async () => { calls++; return { items: [calls], nextCursor: undefined } }
    const { result } = renderHook(() => useInfiniteList(load))
    await waitFor(() => expect(result.current.items).toEqual([1]))
    await act(async () => { await result.current.reset() })
    expect(result.current.items).toEqual([2])
  })

  it('실패하면 error 를 채우고 items 는 유지한다', async () => {
    let calls = 0
    const load = async () => {
      calls++
      if (calls === 2) throw new Error('boom')
      return { items: [calls], nextCursor: 'c' }
    }
    const { result } = renderHook(() => useInfiniteList(load))
    await waitFor(() => expect(result.current.items).toEqual([1]))
    await act(async () => { await result.current.loadMore() })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.items).toEqual([1])
  })
})
