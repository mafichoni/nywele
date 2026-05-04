import { cn } from '@/lib/utils'

interface Props { className?: string }

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/5 bg-shimmer-gradient bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  )
}

export function StaffCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </div>
    </div>
  )
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
}
