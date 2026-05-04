import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/BadgeChip'
import { cn, formatPoints, SPECIALTY_META } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'

interface Props {
  entry: LeaderboardEntry
  index: number
}

const RANK_STYLES: Record<number, string> = {
  1: 'text-brand-gold font-bold text-lg',
  2: 'text-silver font-bold text-base',
  3: 'text-orange-400 font-bold text-base',
}

export function LeaderboardRow({ entry, index }: Props) {
  const navigate = useNavigate()
  const rankStyle = RANK_STYLES[entry.rank] ?? 'text-white/50 text-sm'
  const specialty = entry.specialty ? SPECIALTY_META[entry.specialty] : null

  function handleClick() {
    if (entry.staffId) navigate(`/staff/${entry.staffId}`)
    else if (entry.outletId) navigate(`/outlet/${entry.outletId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
      layout
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/4 active:bg-white/6',
        entry.rank <= 3 && 'bg-brand-gold/5 border-l-2',
        entry.rank === 1 && 'border-brand-gold',
        entry.rank === 2 && 'border-silver',
        entry.rank === 3 && 'border-orange-400'
      )}
      onClick={handleClick}
    >
      {/* Rank */}
      <div className={cn('w-8 text-center font-mono shrink-0', rankStyle)}>
        {entry.rank <= 3 ? ['👑', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
      </div>

      {/* Avatar */}
      <Avatar
        src={entry.avatar}
        name={entry.name}
        size="md"
        ring={entry.subscriptionTier === 'FEATURED' ? 'gold' : 'none'}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-heading font-semibold text-white text-sm truncate">
            {entry.name}
          </span>
          {entry.subscriptionTier === 'FEATURED' && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold">F</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {specialty && (
            <span className="text-xs text-silver">{specialty.emoji} {specialty.label}</span>
          )}
          <span className="text-xs text-silver/60">{entry.city}</span>
        </div>
        {entry.badgeIds.length > 0 && (
          <BadgeList badgeIds={entry.badgeIds} max={2} size="sm" className="mt-1" />
        )}
      </div>

      {/* Score & change */}
      <div className="shrink-0 text-right space-y-0.5">
        <div className="font-mono font-bold text-brand-gold text-sm">
          {formatPoints(entry.score)}
          <span className="text-[10px] text-silver ml-0.5">pts</span>
        </div>
        <ChangeIndicator entry={entry} />
      </div>
    </motion.div>
  )
}

function ChangeIndicator({ entry }: { entry: LeaderboardEntry }) {
  if (entry.change === 'new') {
    return <span className="text-[10px] text-brand-green-light font-bold px-1.5 py-0.5 rounded bg-brand-green/20">NEW</span>
  }
  if (entry.change === 'same' || entry.previousRank == null) {
    return <span className="text-[10px] text-silver"><Minus size={10} /></span>
  }
  const diff = entry.previousRank - entry.rank
  if (diff > 0) {
    return (
      <span className="flex items-center justify-end gap-0.5 text-[10px] text-green-400">
        <TrendingUp size={10} />+{diff}
      </span>
    )
  }
  return (
    <span className="flex items-center justify-end gap-0.5 text-[10px] text-red-400">
      <TrendingDown size={10} />{diff}
    </span>
  )
}
