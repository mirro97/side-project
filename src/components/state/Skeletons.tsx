import { Skeleton } from '@/components/ui/skeleton'

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="rounded-card h-11 w-full" />
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="rounded-card aspect-square" />
      ))}
    </div>
  )
}
