/** 값이 최솟값이어도 막대가 보이도록 남기는 최소 폭 */
const MIN_WIDTH_PERCENT = 3

/**
 * 눈금 범위는 게임 데이터의 ranges 를 그대로 받는다.
 * 브롤러 간 비교가 성립하려면 축이 고정돼야 한다.
 */
export function StatBar({
  label,
  value,
  range,
}: {
  label: string
  value: number
  range: [number, number]
}) {
  const [min, max] = range
  const ratio = max > min ? (value - min) / (max - min) : 0
  // 정규화 기준이 실제 최솟값이라 최하위 브롤러는 0% 가 되어 막대가 사라진다.
  // 데이터가 없는 것과 구분되지 않으므로 바닥을 깔아준다
  const pct = Math.max(MIN_WIDTH_PERCENT, Math.min(100, Math.round(ratio * 100)))

  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-text-tertiary">{label}</span>
        <b className="font-bold">{value.toLocaleString('en-US')}</b>
      </div>
      <div className="bg-bg-surface h-[5px] overflow-hidden rounded-full">
        <div
          className="from-brand to-brand-hover h-full rounded-full bg-gradient-to-r"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
