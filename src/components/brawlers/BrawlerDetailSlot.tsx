'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getBrawler } from '@/lib/game-data'
import { useMainAccount } from '@/hooks/useMainAccount'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { BrawlerDetail } from './BrawlerDetail'
import type { BsErrorKind } from '@/lib/bs/errors'
import type { Player } from '@/types/api'
import type { Locale } from '@/types/game'

interface PlayerResult {
  ok: boolean
  data?: Player
  kind?: BsErrorKind
}

async function fetchPlayer(tag: string): Promise<PlayerResult> {
  const res = await fetch(`/api/player/${encodeURIComponent(tag)}`)
  return (await res.json()) as PlayerResult
}

/**
 * useSearchParams 는 정적 렌더링을 클라이언트로 밀어낸다(BAILOUT_TO_CLIENT_SIDE_RENDERING).
 * 그리드까지 함께 끌려가지 않도록 패널만 이 컴포넌트로 분리해 Suspense 로 감싼다.
 */
export function BrawlerDetailSlot({ locale }: { locale: Locale }) {
  const router = useRouter()
  const params = useSearchParams()
  const { mainAccountTag } = useMainAccount()

  const id = params.get('brawler')
  const brawler = id ? getBrawler(Number(id)) : undefined

  // 그리드와 같은 키라 react-query 가 요청을 합친다
  const { data } = useQuery({
    queryKey: ['player', mainAccountTag],
    queryFn: () => fetchPlayer(mainAccountTag as string),
    enabled: Boolean(mainAccountTag),
  })
  const mine =
    brawler && data?.ok ? data.data?.brawlers.find(b => b.id === brawler.id) : undefined

  return (
    <DetailPanel
      open={Boolean(brawler)}
      onClose={() => router.push('?', { scroll: false })}
      title={brawler?.name[locale] ?? ''}
    >
      {brawler && (
        <BrawlerDetail
          brawler={brawler}
          locale={locale}
          progress={
            mine ? { power: mine.power, trophies: mine.trophies, rank: mine.rank } : undefined
          }
        />
      )}
    </DetailPanel>
  )
}
