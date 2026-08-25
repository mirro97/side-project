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
  const pct = Math.round(((value - range[0]) / (range[1] - range[0])) * 100)
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-text-tertiary">{label}</span>
        <b className="font-bold">{value.toLocaleString('en-US')}</b>
      </div>
      <div className="bg-bg-surface h-[5px] overflow-hidden rounded-full">
        <div
          className="from-brand to-brand-hover h-full rounded-full bg-gradient-to-r"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  )
}
