import { motion } from 'framer-motion'
import { cn, BADGE_META } from '@/lib/utils'
import type { BadgeId } from '@/types'

interface Props {
  badge: BadgeId
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

export function BadgeChip({ badge, size = 'md', animate = false, className }: Props) {
  const meta = BADGE_META[badge]
  if (!meta) return null

  const sizeClass = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  }[size]

  const chip = (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-body font-medium',
        'bg-gradient-to-r text-white shadow-sm',
        `bg-gradient-to-r ${meta.color}`,
        sizeClass,
        className
      )}
    >
      <span>{meta.emoji}</span>
      <span className="leading-none">{meta.label}</span>
    </span>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        {chip}
      </motion.div>
    )
  }

  return chip
}

interface BadgeListProps {
  badgeIds: BadgeId[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BadgeList({ badgeIds, max = 3, size = 'sm', className }: BadgeListProps) {
  const visible = badgeIds.slice(0, max)
  const overflow = badgeIds.length - max

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((b) => (
        <BadgeChip key={b} badge={b} size={size} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs text-silver">
          +{overflow}
        </span>
      )}
    </div>
  )
}
