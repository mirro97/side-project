const MEDAL: Record<number, string> = {
  1: 'bg-rank-1 text-text-inverse',
  2: 'bg-rank-2 text-text-inverse',
  3: 'bg-rank-3 text-text-inverse',
}

export function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL[rank]
  return (
    <span
      className={`grid h-6 w-7 shrink-0 place-items-center rounded-[7px] text-[11px] ${
        medal ? `font-extrabold ${medal}` : 'text-text-tertiary font-semibold'
      }`}
    >
      {rank}
    </span>
  )
}
