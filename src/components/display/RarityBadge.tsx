/**
 * 희귀도는 색만으로 구분하지 않는다.
 * Legendary 와 Ultra Legendary 가 둘 다 노랑-연두라 색만으로는 읽히지 않고,
 * 트로피 노랑과도 가깝다. 라벨 텍스트를 항상 함께 둔다.
 */
export function RarityBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  )
}
