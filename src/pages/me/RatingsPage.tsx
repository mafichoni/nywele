import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { StarRating } from '@/components/ui/StarRating'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { ratingsApi } from '@/lib/api'
import { formatRelativeTime, SPECIALTY_META } from '@/lib/utils'

interface RatingItem {
  id: string
  score: number
  review: string | null
  images: string[]
  serviceCategory: string
  createdAt: string
  client?: { id: string; name: string; avatar: string | null }
  staff?: {
    id: string
    user: { id: string; name: string; avatar: string | null }
    specialties: string[]
    city: string
  }
}

export default function RatingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [ratings, setRatings] = useState<RatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'given' | 'received'>('given')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    ratingsApi.getMyRatings(page)
      .then(({ data }) => {
        setRatings((prev) => page === 1 ? data.ratings : [...prev, ...data.ratings])
        setHasMore(data.hasMore)
        setTotal(data.total)
        setType(data.type)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, page])

  const isStaff = user?.role === 'STAFF'

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-onyx/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="font-heading font-black text-white text-lg">
            {isStaff ? 'Reviews Received' : 'Ratings Given'}
          </h1>
          {!loading && <p className="text-xs text-silver">{total} total</p>}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading && page === 1 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/8 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : ratings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-3"
          >
            <div className="text-5xl">⭐</div>
            <div className="text-white font-semibold">
              {isStaff ? 'No reviews yet' : 'No ratings given yet'}
            </div>
            <div className="text-silver text-sm">
              {isStaff
                ? 'Reviews from clients will appear here.'
                : 'Rate a service provider to see your ratings here.'}
            </div>
          </motion.div>
        ) : (
          ratings.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl bg-white/5 border border-white/8 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                {type === 'received' && r.client ? (
                  <>
                    <Avatar src={r.client.avatar} name={r.client.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{r.client.name}</div>
                      <div className="text-xs text-silver">{formatRelativeTime(r.createdAt)}</div>
                    </div>
                  </>
                ) : r.staff ? (
                  <>
                    <Avatar src={r.staff.user.avatar} name={r.staff.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{r.staff.user.name}</div>
                      <div className="text-xs text-silver flex items-center gap-1.5">
                        {r.staff.specialties[0] && SPECIALTY_META[r.staff.specialties[0] as keyof typeof SPECIALTY_META]?.label}
                        · {r.staff.city}
                      </div>
                    </div>
                  </>
                ) : null}
                <StarRating score={r.score} size="sm" showNumber />
              </div>

              <div className="text-xs text-brand-gold/80 capitalize">
                {r.serviceCategory.replace(/_/g, ' ')}
              </div>

              {r.review && (
                <p className="text-sm text-white/70 leading-relaxed">{r.review}</p>
              )}

              {r.images.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {r.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}

        {hasMore && !loading && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full py-3 text-sm text-brand-gold hover:text-brand-gold/80 font-medium"
          >
            Load more
          </button>
        )}

        {loading && page > 1 && (
          <div className="text-center py-4">
            <div className="inline-block h-5 w-5 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
