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
