import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { StaffProfile, FeedFilters, GeoLocation } from '@/types'

interface FeedState {
  items: StaffProfile[]
  page: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
  filters: FeedFilters
  location: GeoLocation | null
  upvotedIds: Set<string>

  setItems: (items: StaffProfile[]) => void
  appendItems: (items: StaffProfile[]) => void
  setPage: (page: number) => void
  setHasMore: (v: boolean) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setFilters: (filters: Partial<FeedFilters>) => void
  resetFilters: () => void
  setLocation: (loc: GeoLocation | null) => void
  addUpvote: (staffId: string) => void
  removeUpvote: (staffId: string) => void
  hasUpvoted: (staffId: string) => boolean
}

const DEFAULT_FILTERS: FeedFilters = {
  specialty: null,
  city: null,
  freelanceOnly: false,
  mobileServiceOnly: false,
  availableToday: false,
  featuredOnly: false,
  maxDistanceKm: 20,
}

export const useFeedStore = create<FeedState>()(
  immer((set, get) => ({
    items: [],
    page: 1,
    hasMore: true,
    isLoading: false,
    error: null,
    filters: DEFAULT_FILTERS,
    location: null,
    upvotedIds: new Set(),

    setItems: (items) => set((s) => { s.items = items }),
    appendItems: (items) => set((s) => { s.items.push(...items) }),
    setPage: (page) => set((s) => { s.page = page }),
    setHasMore: (v) => set((s) => { s.hasMore = v }),
    setLoading: (v) => set((s) => { s.isLoading = v }),
    setError: (e) => set((s) => { s.error = e }),
    setFilters: (filters) => set((s) => { Object.assign(s.filters, filters); s.items = []; s.page = 1; s.hasMore = true }),
    resetFilters: () => set((s) => { s.filters = DEFAULT_FILTERS; s.items = []; s.page = 1; s.hasMore = true }),
    setLocation: (loc) => set((s) => { s.location = loc }),
    addUpvote: (id) => set((s) => { s.upvotedIds.add(id) }),
    removeUpvote: (id) => set((s) => { s.upvotedIds.delete(id) }),
    hasUpvoted: (id) => get().upvotedIds.has(id),
  }))
)
