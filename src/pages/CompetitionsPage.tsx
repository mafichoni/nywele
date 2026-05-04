import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Upload, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { competitionsApi } from '@/lib/api'
import { formatKes, formatCountdown, vibrate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Competition, CompetitionEntry } from '@/types'

type Tab = 'active' | 'upcoming' | 'archive'

function Countdown({ endsAt }: { endsAt: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const { days, hours, mins, secs, expired } = formatCountdown(endsAt)
  if (expired) return <span className="text-red-400 text-xs font-mono">Ended</span>
  const isUrgent = days === 0 && hours === 0 && mins < 60
  return (
    <div className={`flex items-center gap-1 font-mono text-xs ${isUrgent ? 'text-red-400' : 'text-brand-gold'}`}>
      {days > 0 && <><span className="font-bold">{days}</span><span className="text-silver">d </span></>}
      <span className="font-bold">{hours.toString().padStart(2, '0')}</span>
      <span className="text-silver">:</span>
      <span className="font-bold">{mins.toString().padStart(2, '0')}</span>
      <span className="text-silver">:</span>
      <span className="font-bold">{secs.toString().padStart(2, '0')}</span>
    </div>
  )
}

export default function CompetitionsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.user?.role)

  const [tab, setTab] = useState<Tab>('active')
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Competition | null>(null)
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    competitionsApi.list(tab)
      .then(({ data }) => setCompetitions(data.competitions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab])

  async function loadEntries(comp: Competition) {
    setSelected(comp)
    setEntriesLoading(true)
    try {
      const { data } = await competitionsApi.getEntries(comp.id)
      setEntries(data.entries)
    } finally {
      setEntriesLoading(false)
    }
  }

  async function handleVote(entryId: string) {
    vibrate(50)
    try {
      await competitionsApi.vote(entryId)
      setVotedIds((prev) => new Set([...prev, entryId]))
      setEntries((prev) =>
        prev.map((e) => e.id === entryId ? { ...e, voteCount: e.voteCount + 1 } : e)
          .sort((a, b) => b.voteCount - a.voteCount)
          .map((e, i) => ({ ...e, rank: i + 1 }))
      )
      toast('Vote cast! 5 Taste Points deducted.', 'success')
    } catch {
      toast('Could not cast vote. Try again.', 'error')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: '🔥 Active' },
    { key: 'upcoming', label: '📅 Upcoming' },
    { key: 'archive', label: '📜 Archive' },
  ]

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Swords size={20} className="text-brand-gold" />
          <h1 className="font-heading font-bold text-xl text-white">Compete</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${tab === key ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)
        ) : competitions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🏆</div>
            <div className="font-heading font-bold text-white">No competitions {tab}</div>
            <div className="text-silver text-sm mt-1">Check back soon!</div>
          </div>
        ) : (
          competitions.map((comp, i) => (
            <motion.article
              key={comp.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/10 bg-white/4 overflow-hidden"
            >
              {comp.coverImage && (
                <div className="h-32 overflow-hidden">
                  <img src={comp.coverImage} alt={comp.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading font-bold text-white text-base">{comp.title}</h3>
                    <p className="text-sm text-silver mt-0.5">{comp.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-brand-gold font-mono font-bold text-sm">{formatKes(comp.prizePool)}</div>
                    <div className="text-[10px] text-silver">Prize Pool</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-silver">
                  <span>👥 {comp.participantCount} entries</span>
                  <span>🗳️ {comp.totalVotes} votes</span>
                  <span>💰 Entry: {formatKes(comp.entryFeeKes)}</span>
                </div>

                {(tab === 'active') && (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-silver">
                      {comp.status === 'voting' ? 'Voting ends in:' : 'Entry closes in:'}
                    </div>
                    <Countdown endsAt={comp.status === 'voting' ? comp.votingCloseDate : comp.entryCloseDate} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" fullWidth onClick={() => loadEntries(comp)}>
                    View Entries
                  </Button>
                  {role === 'STAFF' && (comp.status === 'entry_open') && (
                    <Button variant="gold" size="sm" fullWidth>
                      <Upload size={13} /> Enter Now
                    </Button>
                  )}
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>

      {/* Entries drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-onyx border-t border-white/10 max-h-[85vh] flex flex-col"
            >
              <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between">
                <div>
                  <div className="font-heading font-bold text-white">{selected.title}</div>
                  <div className="text-xs text-silver">{entries.length} entries</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-silver hover:text-white">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {entriesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : (
                  entries.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-xl border p-3 flex gap-3 ${i < 3 ? 'border-brand-gold/30 bg-brand-gold/5' : 'border-white/8 bg-white/3'}`}
                    >
                      <div className="shrink-0">
                        {entry.imageUrl && (
                          <img src={entry.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-brand-gold font-bold">#{entry.rank ?? i + 1}</span>
                          <span className="font-semibold text-white text-sm truncate">{entry.staff.user.name}</span>
                        </div>
                        {entry.caption && <p className="text-xs text-silver mt-0.5 line-clamp-2">{entry.caption}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-silver">🗳️ {entry.voteCount} votes</span>
                          {selected.status === 'voting' && (
                            <Button
                              variant={votedIds.has(entry.id) ? 'gold' : 'secondary'}
                              size="sm"
                              onClick={() => handleVote(entry.id)}
                              disabled={votedIds.has(entry.id)}
                            >
                              <ChevronUp size={12} />
                              {votedIds.has(entry.id) ? 'Voted' : 'Vote'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
