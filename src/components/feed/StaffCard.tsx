import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, ChevronUp, MessageCircle, Star } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/BadgeChip'
import { Button } from '@/components/ui/Button'
import { StarRating } from '@/components/ui/StarRating'
import { cn, SPECIALTY_META, formatPoints, vibrate } from '@/lib/utils'
import { staffApi } from '@/lib/api'
import { useFeedStore } from '@/store/feedStore'
import { useToast } from '@/components/ui/Toast'
import type { StaffProfile } from '@/types'

interface Props {
  staff: StaffProfile
  index?: number
}

export function StaffCard({ staff, index = 0 }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const hasUpvoted = useFeedStore((s) => s.hasUpvoted(staff.id))
  const addUpvote = useFeedStore((s) => s.addUpvote)
  const removeUpvote = useFeedStore((s) => s.removeUpvote)
  const [upvoteCount, setUpvoteCount] = useState(staff.upvoteCount)
  const [upvoting, setUpvoting] = useState(false)

  const isFeatured = staff.subscriptionTier === 'FEATURED'
  const primarySpecialty = staff.specialties[0]
  const specialtyMeta = primarySpecialty ? SPECIALTY_META[primarySpecialty] : null

  async function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation()
    if (upvoting) return
    vibrate(50)
    setUpvoting(true)
    try {
      await staffApi.upvote(staff.id)
      if (hasUpvoted) {
        removeUpvote(staff.id)
        setUpvoteCount((c) => c - 1)
      } else {
        addUpvote(staff.id)
        setUpvoteCount((c) => c + 1)
      }
    } catch {
      toast('Could not upvote. Try again.', 'error')
    } finally {
      setUpvoting(false)
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/staff/${staff.id}`)}
      className={cn(
        'relative rounded-2xl border bg-onyx cursor-pointer overflow-hidden',
        'transition-shadow hover:shadow-xl hover:shadow-brand-green/10',
        isFeatured
          ? 'border-brand-gold/40 shadow-md shadow-brand-gold/10'
          : 'border-white/8'
      )}
    >
      {isFeatured && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-gold via-yellow-300 to-brand-gold" />
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar
            src={staff.user.avatar}
            name={staff.user.name}
            size="lg"
            ring={isFeatured ? 'gold' : 'none'}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-heading font-bold text-white text-base leading-tight truncate">
                {staff.user.name}
              </h3>
              {isFeatured && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-bold">
                  FEATURED
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {specialtyMeta && (
                <span className="text-sm text-silver">
                  {specialtyMeta.emoji} {specialtyMeta.label}
                </span>
              )}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', staff.freelance ? 'bg-blue-500/15 text-blue-400' : 'bg-brand-green/20 text-brand-green-light')}>
                {staff.freelance ? 'Freelance' : staff.outlet?.name ?? 'Outlet'}
              </span>
              {staff.mobileService && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                  📱 Mobile
                </span>
              )}
            </div>
          </div>

          {/* Points badge */}
          <div className="shrink-0 text-right">
            <div className="font-mono font-bold text-brand-gold text-sm">
              {formatPoints(staff.totalPoints)}
            </div>
            <div className="text-[10px] text-silver">points</div>
          </div>
        </div>

        {/* Rating & location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating score={staff.avgRating} size="sm" showNumber />
            <span className="text-xs text-silver">({staff.reviewCount})</span>
          </div>
          {staff.city && (
            <div className="flex items-center gap-1 text-xs text-silver">
              <MapPin size={11} />
              <span>{staff.city}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {staff.bio && (
          <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">{staff.bio}</p>
        )}

        {/* Badges */}
        {staff.badgeIds.length > 0 && (
          <BadgeList badgeIds={staff.badgeIds} max={3} size="sm" />
        )}

        {/* Availability */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            staff.availableToday ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-white/20'
          )} />
          <span className="text-xs text-silver">
            {staff.availableToday ? 'Available today' : 'Not available today'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/staff/${staff.id}`)}
          >
            View Profile
          </Button>
          <Button
            variant={hasUpvoted ? 'gold' : 'secondary'}
            size="sm"
            className="flex items-center gap-1"
            onClick={handleUpvote}
            loading={upvoting}
          >
            <ChevronUp size={14} />
            <span className="font-mono">{upvoteCount}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`https://wa.me/${staff.user.phone.replace(/\D/g, '')}`, '_blank')}
          >
            <MessageCircle size={14} />
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
