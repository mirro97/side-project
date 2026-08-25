import { formatTrophies } from '@/lib/format'

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]" aria-hidden>
      <path d="M18 4h2a1 1 0 011 1v2a4 4 0 01-3.4 3.95A6 6 0 0113 14.9V18h3a1 1 0 110 2H8a1 1 0 110-2h3v-3.1a6 6 0 01-4.6-3.95A4 4 0 013 7V5a1 1 0 011-1h2V3h12v1zM6 6H5v1a2 2 0 001 1.7V6zm13 0h-1v2.7A2 2 0 0019 7V6z" />
    </svg>
  )
}

export function TrophyValue({ value }: { value: number }) {
  return (
    <span className="text-trophy flex shrink-0 items-center gap-1 text-[13px] font-bold">
      <TrophyIcon />
      {formatTrophies(value)}
    </span>
  )
}
