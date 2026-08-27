'use client'
import { useQuery } from '@tanstack/react-query'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { Player } from '@/types/api'

export interface PlayerResult {
  ok: boolean
  data?: Player
  kind?: BsErrorKind
}

/** 실패해도 kind 를 들고 와야 UI 가 분기할 수 있어 throw 하지 않는다 */
async function fetchPlayer(tag: string): Promise<PlayerResult> {
  const res = await fetch(`/api/player/${encodeURIComponent(tag)}`)
  return (await res.json()) as PlayerResult
}

/**
 * 플레이어 한 명을 조회한다.
 *
 * 홈·브롤러·랭킹·추천이 전부 같은 응답을 쓰는데 파일마다 복붙되어 있었다.
 * 응답 형태가 바뀌면 다섯 곳을 고쳐야 했다.
 *
 * 태그가 같으면 react-query 가 요청을 합친다.
 */
export function usePlayer(tag: string | null | undefined) {
  const query = useQuery({
    queryKey: ['player', tag],
    queryFn: () => fetchPlayer(tag as string),
    enabled: Boolean(tag),
  })

  return {
    ...query,
    /** 성공 응답의 본문만. 실패했거나 아직이면 undefined */
    player: query.data?.ok ? query.data.data : undefined,
    /** 화면에 보여줄 오류 종류 */
    errorKind: (query.data && !query.data.ok ? query.data.kind : undefined) ?? 'Unknown',
  }
}
