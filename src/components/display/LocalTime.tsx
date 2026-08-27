'use client'
import { useSyncExternalStore } from 'react'

/** 구독할 외부 상태가 없다. 서버/클라이언트를 가르는 용도로만 쓴다 */
const noopSubscribe = () => () => {}

/**
 * 시각을 사용자 로컬 타임존으로 보여준다. 이벤트 종료 시각과 전투 시각이 함께 쓴다.
 *
 * toLocaleString 결과는 실행 환경의 타임존에 따라 달라진다. 서버가 만든 문자열과
 * 클라이언트가 만든 문자열이 다르면 하이드레이션이 어긋나므로 마운트 후에만 그린다.
 * 해외 사용자가 주 타겟이라 UTC 를 그대로 노출할 수는 없다.
 *
 * useEffect + setState 로 하면 cascading render 룰에 걸린다.
 * 서버 스냅샷과 클라이언트 스냅샷을 다르게 주는 것으로 충분하다.
 */
export function LocalTime({
  at,
  locale,
  className = 'text-text-tertiary text-[11px] tabular-nums',
}: {
  at: Date
  locale: string
  className?: string
}) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )

  return (
    <span className={className}>
      {mounted
        ? at.toLocaleString(locale, {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : // 서버 렌더에서는 자리만 잡는다
          ' '}
    </span>
  )
}
