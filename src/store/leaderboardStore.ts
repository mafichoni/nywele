import { create } from 'zustand'
import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardType, Specialty } from '@/types'

interface LeaderboardState {
  entries: LeaderboardEntry[]
  type: LeaderboardType
  period: LeaderboardPeriod
  specialty: Specialty | 'all'
  city: string
  isLoading: boolean
  lastUpdated: number | null

  setEntries: (entries: LeaderboardEntry[]) => void
  setType: (type: LeaderboardType) => void
  setPeriod: (period: LeaderboardPeriod) => void
  setSpecialty: (specialty: Specialty | 'all') => void
  setCity: (city: string) => void
  setLoading: (v: boolean) => void
  updateEntry: (staffId: string, patch: Partial<LeaderboardEntry>) => void
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  entries: [],
  type: 'staff',
  period: 'weekly',
  specialty: 'all',
  city: 'Nairobi',
  isLoading: false,
  lastUpdated: null,

  setEntries: (entries) => set({ entries, lastUpdated: Date.now() }),
  setType: (type) => set({ type, entries: [] }),
  setPeriod: (period) => set({ period, entries: [] }),
  setSpecialty: (specialty) => set({ specialty, entries: [] }),
  setCity: (city) => set({ city, entries: [] }),
  setLoading: (isLoading) => set({ isLoading }),
  updateEntry: (staffId, patch) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.staffId === staffId ? { ...e, ...patch } : e
      ),
    })),
}))
