'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrawler } from '@/lib/game-data'
import { useMainAccount } from '@/hooks/useMainAccount'
import { usePlayer } from '@/hooks/usePlayer'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { BrawlerDetail } from './BrawlerDetail'
import type { Locale } from '@/types/game'

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
  const { player } = usePlayer(mainAccountTag)
  const mine = brawler ? player?.brawlers.find(b => b.id === brawler.id) : undefined

  // 상세를 열 때 어떤 데이터가 실렸는지 콘솔에서 바로 본다. 개발 중에만 찍는다
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !brawler) return
    console.groupCollapsed(
      `[brawler] ${brawler.name.ko} / ${brawler.name.en} (#${brawler.id})`,
    )
    console.log('기본', {
      역할: brawler.role,
      희귀도: brawler.rarity.name,
      HP: brawler.stats.hp,
      이동속도: brawler.stats.speed,
      사거리: brawler.stats.range,
    })
    console.table(
      [
        ...brawler.starPowers.map(a => ({ 종류: '스타파워', ...a })),
        ...brawler.gadgets.map(a => ({ 종류: '가젯', ...a })),
      ].map(a => ({
        종류: a.종류,
        이름: a.name.ko,
        설명: a.description?.ko ?? '— 없음',
        description: a.description?.en ?? '— none',
      })),
    )
    console.table(
      brawler.gears.map(g => ({
        이름: g.name.ko,
        수치: g.modifier ? `${g.modifier.value} (${g.modifier.type})` : '— 없음',
      })),
    )
    console.log('내 진행도', mine ?? '— 대표 계정 없음 / 미보유')
    console.groupEnd()
  }, [brawler, mine])

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
