import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X, MapPin, Loader2 } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { useState } from 'react'
import { StaffCard } from '@/components/feed/StaffCard'
import { StaffCardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useFeedStore } from '@/store/feedStore'
import { staffApi } from '@/lib/api'
import { SPECIALTY_META } from '@/lib/utils'
import type { Specialty } from '@/types'

export default function DiscoverPage() {
  const {
    items, page, hasMore, isLoading, filters,
    setItems, appendItems, setPage, setHasMore, setLoading, setError,
    setFilters, resetFilters, location, setLocation,
  } = useFeedStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery] = useDebounce(searchQuery, 400)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!location) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, city: 'Nairobi' }),
        () => setLocation({ latitude: -1.2921, longitude: 36.8219, city: 'Nairobi' })
      )
    }
  }, [location, setLocation])

  const loadFeed = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 1 : page
      const { data } = await staffApi.getFeed({
        page: currentPage,
        q: debouncedQuery,
        specialty: filters.specialty,
        city: filters.city,
        freelance: filters.freelanceOnly || undefined,
        mobileService: filters.mobileServiceOnly || undefined,
        availableToday: filters.availableToday || undefined,
        lat: location?.latitude,
        lng: location?.longitude,
        radiusKm: filters.maxDistanceKm,
      })
      if (reset) {
        setItems(data.items)
        setPage(2)
      } else {
        appendItems(data.items)
        setPage(currentPage + 1)
      }
      setHasMore(data.hasMore)
    } catch {
      setError('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedQuery, filters, location, setItems, appendItems, setPage, setHasMore, setLoading, setError])

  useEffect(() => {
    loadFeed(true)
  }, [debouncedQuery, filters])

  const specialties = Object.entries(SPECIALTY_META) as [Specialty, { label: string; emoji: string }][]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-white">Discover</h1>
            {location && (
              <div className="flex items-center gap-1 text-xs text-silver">
                <MapPin size={10} />{location.city}
              </div>
            )}
          </div>
          <Button
            variant={showFilters ? 'gold' : 'secondary'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={14} />
            Filters
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, services..."
            className="w-full rounded-xl bg-white/8 border border-white/10 text-white pl-9 pr-4 py-2 text-sm outline-none focus:border-brand-gold/40 placeholder-white/30"
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-silver" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Specialty pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilters({ specialty: null })}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${!filters.specialty ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver hover:bg-white/12'}`}
          >
            All
          </button>
          {specialties.map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilters({ specialty: filters.specialty === key ? null : key })}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${filters.specialty === key ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver hover:bg-white/12'}`}
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 py-2">
                {[
                  { key: 'freelanceOnly' as const, label: 'Freelance only' },
                  { key: 'mobileServiceOnly' as const, label: '📱 Mobile / Home' },
                  { key: 'availableToday' as const, label: '🟢 Available today' },
                  { key: 'featuredOnly' as const, label: '⭐ Featured' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilters({ [key]: !filters[key] })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${filters[key] ? 'bg-brand-green-mid text-white' : 'bg-white/8 text-silver hover:bg-white/12'}`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={resetFilters}
                  className="rounded-full px-3 py-1 text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading && items.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <StaffCardSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-heading font-bold text-white text-lg">No professionals found</div>
            <div className="text-silver text-sm mt-1">Try adjusting your filters or expanding the search area</div>
            <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            {items.map((staff, i) => (
              <StaffCard key={staff.id} staff={staff} index={i} />
            ))}
            {hasMore && (
              <div className="py-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => loadFeed(false)} loading={isLoading}>
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
