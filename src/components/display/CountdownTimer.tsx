'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { formatRemaining } from '@/lib/format'

/** 구독할 외부 상태가 없다. 서버/클라이언트를 가르는 용도로만 쓴다 */
const noopSubscribe = () => () => {}

/**
 * 1분 간격으로 갱신한다. 초 단위로 돌리면 리렌더가 과하다.
 *
 * **남은 시간을 서버에서 그리면 안 된다.** 페이지가 정적으로 생성되므로 HTML 에 박히는
 * 값은 빌드 시각 기준이고, 클라이언트는 지금 시각으로 계산해 하이드레이션이 어긋난다
 * (실측: 프로덕션 빌드의 홈·이벤트에서 React #418).
 * 마운트 전에는 자리만 잡는다.
 */
export function CountdownTimer({ end, onEnded }: { end: Date; onEnded?: () => void }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  const [t, setT] = useState(() => formatRemaining(end))

  useEffect(() => {
    const id = setInterval(() => {
      const next = formatRemaining(end)
      setT(next)
      if (next.ended) onEnded?.()
    }, 60_000)
    return () => clearInterval(id)
  }, [end, onEnded])

  // 서버 렌더와 첫 페인트에서는 시간을 보여주지 않는다
  if (!mounted) return <span className="text-[11px]">&nbsp;</span>
  if (t.ended) return <span className="text-text-tertiary text-[11px]">—</span>
  return (
    <span
      className={`text-[11px] font-semibold ${t.h < 2 ? 'text-warning' : 'text-text-secondary'}`}
    >
      {t.h > 0 ? `${t.h}h ${t.m}m` : `${t.m}m`}
    </span>
  )
}
