import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, MessageCircle, MapPin, Calendar, Star, Crown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/BadgeChip'
import { StarRating } from '@/components/ui/StarRating'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { RatingModal } from '@/components/ratings/RatingModal'
import { MpesaSubscribeModal } from '@/components/payments/MpesaSubscribeModal'
import { staffApi, ratingsApi } from '@/lib/api'
import { formatPoints, formatRelativeTime, SPECIALTY_META } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import type { StaffProfile, ServiceRating } from '@/types'

type Tab = 'services' | 'portfolio' | 'reviews' | 'about'

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [reviews, setReviews] = useState<ServiceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('services')
  const [ratingOpen, setRatingOpen] = useState(false)
  const [subscribeOpen, setSubscribeOpen] = useState(false)

  const isOwner = user?.id === staff?.userId

  useEffect(() => {
    if (!id) return
    setLoading(true)
    staffApi.getProfile(id)
      .then(({ data }) => setStaff(data.staff))
      .catch(() => toast('Could not load profile.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || tab !== 'reviews') return
    ratingsApi.getStaffRatings(id).then(({ data }) => setReviews(data.ratings))
  }, [id, tab])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `${staff?.user.name} on Nywele`, url })
    } else {
      navigator.clipboard.writeText(url)
      toast('Profile link copied!', 'success')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }

  if (!staff) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'services', label: 'Services' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'reviews', label: `Reviews (${staff.reviewCount})` },
    { key: 'about', label: 'About' },
  ]

  return (
    <div className="pb-6">
      {/* Top nav */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-onyx/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <button onClick={handleShare} className="text-silver hover:text-white">
          <Share2 size={18} />
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Avatar + name */}
        <div className="flex items-start gap-4">
          <Avatar
            src={staff.user.avatar}
            name={staff.user.name}
            size="xl"
            ring={staff.subscriptionTier === 'FEATURED' ? 'gold' : 'none'}
          />
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-black text-white text-xl">{staff.user.name}</h1>
              {staff.subscriptionTier === 'FEATURED' && (
                <Crown size={16} className="text-brand-gold" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {staff.specialties.map((s) => (
                <span key={s} className="text-sm text-silver">
                  {SPECIALTY_META[s]?.emoji} {SPECIALTY_META[s]?.label}
                </span>
              ))}
            </div>
            {staff.outlet && (
              <div className="text-xs text-brand-green-light mt-1">
                🏢 {staff.outlet.name}
              </div>
            )}
            {staff.freelance && (
              <div className="text-xs text-blue-400 mt-1">✦ Freelance Professional</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Points', value: formatPoints(staff.totalPoints), color: 'text-brand-gold' },
            { label: 'Avg Rating', value: staff.avgRating.toFixed(1), color: 'text-brand-green-light' },
            { label: 'Reviews', value: String(staff.reviewCount), color: 'text-white' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
              <div className={`font-mono font-bold text-xl ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-silver mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Rating + location */}
        <div className="flex items-center justify-between">
          <StarRating score={staff.avgRating} showNumber size="md" />
          <div className="flex items-center gap-1 text-xs text-silver">
            <MapPin size={11} />{staff.city}
          </div>
        </div>

        {/* Badges */}
        {staff.badgeIds.length > 0 && (
          <BadgeList badgeIds={staff.badgeIds} max={6} size="sm" />
        )}

        {/* Availability */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2">
          <span className={`h-2 w-2 rounded-full ${staff.availableToday ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-sm text-white/70">
            {staff.availableToday ? 'Available Today' : 'Not available today'}
          </span>
          {staff.mobileService && (
            <span className="ml-auto text-xs text-purple-400">📱 Mobile ({staff.mobileRadiusKm}km radius)</span>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2">
          {isOwner ? (
            <>
              <Button variant="secondary" size="md" fullWidth onClick={() => navigate('/me/edit')}>
                Edit Profile
              </Button>
              <Button variant="gold" size="md" fullWidth onClick={() => setSubscribeOpen(true)}>
                {staff.subscriptionTier === 'NONE' ? 'Activate Listing' : 'Manage Plan'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="gold" size="md" className="flex-1" onClick={() => setRatingOpen(true)}>
                <Star size={15} /> Rate Service
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.open(`https://wa.me/${staff.user.phone.replace(/\D/g, '')}`, '_blank')}
              >
                <MessageCircle size={15} />
              </Button>
              <Button variant="secondary" size="md" onClick={handleShare}>
                <Share2 size={15} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-10 flex border-b border-white/8 bg-onyx px-4 gap-0 overflow-x-auto scrollbar-none">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-3 text-sm font-body font-medium transition-colors relative whitespace-nowrap ${tab === key ? 'text-brand-gold' : 'text-silver hover:text-white'}`}
          >
            {label}
            {tab === key && (
              <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'services' && (
              <div className="space-y-3">
                {staff.serviceMenuItems.length === 0 ? (
                  <div className="text-center py-8 text-silver">No services listed yet</div>
                ) : (
                  staff.serviceMenuItems.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white/5 border border-white/8 p-3 flex items-center justify-between">
                      <div>
                        <div className="font-body font-semibold text-white text-sm">{item.name}</div>
                        {item.description && <div className="text-xs text-silver mt-0.5">{item.description}</div>}
                        <StarRating score={item.avgRating} size="sm" showNumber className="mt-1" />
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {item.priceMin != null && (
                          <div className="text-brand-gold font-mono font-bold text-sm">
                            KES {item.priceMin}{item.priceMax ? `–${item.priceMax}` : '+'}
                          </div>
                        )}
                        {item.durationMinutes && (
                          <div className="text-xs text-silver">{item.durationMinutes} min</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'portfolio' && (
              <div className="grid grid-cols-3 gap-1.5">
                {staff.portfolioImages.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-silver">No portfolio images yet</div>
                ) : (
                  staff.portfolioImages.map((img) => (
                    <motion.div
                      key={img.id}
                      whileTap={{ scale: 0.96 }}
                      className="aspect-square rounded-xl overflow-hidden bg-white/5 relative"
                    >
                      <img src={img.imageUrl} alt={img.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
                      {img.upvotes > 0 && (
                        <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-[10px] bg-black/60 rounded px-1 py-0.5 text-white">
                          ♥ {img.upvotes}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-silver">No reviews yet. Be the first!</div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="rounded-xl bg-white/5 border border-white/8 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar src={r.client.avatar} name={r.client.name} size="sm" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{r.client.name}</div>
                          <div className="text-xs text-silver">{formatRelativeTime(r.createdAt)}</div>
                        </div>
                        <StarRating score={r.score} size="sm" showNumber />
                      </div>
                      {r.review && <p className="text-sm text-white/70">{r.review}</p>}
                      {r.images.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto">
                          {r.images.map((img, i) => (
                            <img key={i} src={img} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" loading="lazy" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-4">
                {staff.bio && (
                  <div>
                    <div className="text-xs text-silver uppercase tracking-wider mb-1.5">Bio</div>
                    <p className="text-sm text-white/80 leading-relaxed">{staff.bio}</p>
                  </div>
                )}
                {staff.outlet && (
                  <div>
                    <div className="text-xs text-silver uppercase tracking-wider mb-1.5">Outlet</div>
                    <div className="rounded-xl bg-white/5 border border-white/8 p-3 flex items-center gap-3">
                      <Avatar src={staff.outlet.logoImage} name={staff.outlet.name} size="md" />
                      <div>
                        <div className="font-semibold text-white">{staff.outlet.name}</div>
                        <div className="text-xs text-silver">{staff.outlet.address}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-silver uppercase tracking-wider mb-1.5">Member Since</div>
                  <div className="text-sm text-white/70">
                    {new Date(staff.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <RatingModal staff={staff} open={ratingOpen} onClose={() => setRatingOpen(false)} />
      <MpesaSubscribeModal
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        entityId={staff.id}
        defaultPlan={staff.subscriptionTier === 'NONE' ? 'staff_basic' : 'staff_featured'}
      />
    </div>
  )
}
