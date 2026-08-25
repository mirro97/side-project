'use client'
import { useEffect, useState } from 'react'
import { formatRemaining } from '@/lib/format'

/** 1분 간격으로 갱신한다. 초 단위로 돌리면 리렌더가 과하다 */
export function CountdownTimer({ end, onEnded }: { end: Date; onEnded?: () => void }) {
  const [t, setT] = useState(() => formatRemaining(end))

  useEffect(() => {
    const id = setInterval(() => {
      const next = formatRemaining(end)
      setT(next)
      if (next.ended) onEnded?.()
    }, 60_000)
    return () => clearInterval(id)
  }, [end, onEnded])

  if (t.ended) return <span className="text-text-tertiary text-[11px]">—</span>
  return (
    <span
      className={`text-[11px] font-semibold ${t.h < 2 ? 'text-warning' : 'text-text-secondary'}`}
    >
      {t.h > 0 ? `${t.h}h ${t.m}m` : `${t.m}m`}
    </span>
  )
}
