import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, RefreshCcw } from 'lucide-react'
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow'
import { LeaderboardRowSkeleton } from '@/components/ui/Skeleton'
import { useLeaderboardStore } from '@/store/leaderboardStore'
import { leaderboardApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { SPECIALTY_META } from '@/lib/utils'
import type { LeaderboardPeriod, Specialty } from '@/types'

const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']

export default function LeaderboardPage() {
  const {
    entries, type, period, specialty, city, isLoading,
    setEntries, setType, setPeriod, setSpecialty, setCity, setLoading, updateEntry, lastUpdated,
  } = useLeaderboardStore()

  async function load() {
    setLoading(true)
    try {
      if (type === 'staff') {
        const { data } = await leaderboardApi.getStaffLeaderboard(specialty === 'all' ? '' : specialty, city, period)
        setEntries(data.entries)
      } else {
        const { data } = await leaderboardApi.getOutletLeaderboard(city, period)
        setEntries(data.entries)
      }
    } catch {
      // silently fail — show stale data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [type, period, specialty, city])

  // Realtime leaderboard updates via Supabase
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard')
      .on('broadcast', { event: 'rank_change' }, ({ payload }) => {
        if (payload?.staffId) {
          updateEntry(payload.staffId, {
            score: payload.score,
            rank: payload.rank,
            previousRank: payload.previousRank,
            change: payload.change,
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const periods: { key: LeaderboardPeriod; label: string }[] = [
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'alltime', label: 'All Time' },
  ]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-brand-gold" />
            <h1 className="font-heading font-bold text-xl text-white">Leaderboard</h1>
          </div>
          <button onClick={load} className="text-silver hover:text-white transition-colors p-1">
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Staff / Outlet toggle */}
        <div className="flex rounded-xl bg-white/5 p-1 gap-1">
          {(['staff', 'outlet'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-heading font-semibold transition-all capitalize ${type === t ? 'bg-brand-gold text-brand-green' : 'text-silver hover:text-white'}`}
            >
              {t === 'staff' ? 'Top Staff' : 'Top Outlets'}
            </button>
          ))}
        </div>

        {/* Period tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${period === key ? 'bg-brand-green-mid text-white' : 'bg-white/8 text-silver'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Specialty filter (staff only) */}
        {type === 'staff' && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSpecialty('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${specialty === 'all' ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver'}`}
            >
              All
            </button>
            {(Object.entries(SPECIALTY_META) as [Specialty, { label: string; emoji: string }][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setSpecialty(key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${specialty === key ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver'}`}
              >
                {meta.emoji} {meta.label}
              </button>
            ))}
          </div>
        )}

        {/* City selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${city === c ? 'bg-brand-green text-brand-gold font-bold' : 'bg-white/8 text-silver'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="px-4 py-1.5 text-[10px] text-silver/50 text-right">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}

      {/* Entries */}
      <div className="divide-y divide-white/5">
        {isLoading && entries.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <div className="font-heading font-bold text-white">No entries yet</div>
            <div className="text-silver text-sm mt-1">Be the first to get rated!</div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {entries.map((entry, i) => (
              <LeaderboardRow key={entry.staffId ?? entry.outletId} entry={entry} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
