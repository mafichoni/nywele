import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle, BarChart3, Users, DollarSign, Trophy } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { adminApi } from '@/lib/api'
import { formatKes } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

type QueueItem = {
  id: string
  type: 'staff_profile' | 'review_image' | 'community_post'
  entityName: string
  entityAvatar: string | null
  reason: string
  createdAt: string
}

type Stats = {
  totalStaff: number
  activeSubscriptions: number
  mrr: number
  totalRatings: number
  pendingModeration: number
  competitionsActive: number
}

type Tab = 'moderation' | 'stats'

export default function AdminPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState<Tab>('moderation')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/discover', { replace: true })
      return
    }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    try {
      const [queueRes, statsRes] = await Promise.all([
        adminApi.getModerationQueue(),
        adminApi.getStats(),
      ])
      setQueue(queueRes.data.items)
      setStats(statsRes.data)
    } catch {
      toast('Failed to load admin data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handle(item: QueueItem, action: 'approve' | 'reject') {
    setProcessingId(item.id)
    try {
      if (action === 'approve') {
        await adminApi.approveItem(item.type, item.id)
      } else {
        await adminApi.rejectItem(item.type, item.id, 'Violates community guidelines')
      }
      setQueue((q) => q.filter((i) => i.id !== item.id))
      toast(`${action === 'approve' ? 'Approved' : 'Rejected'}: ${item.entityName}`, 'success')
    } catch {
      toast('Action failed. Try again.', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  if (user?.role !== 'ADMIN') return null

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-red-400" />
          <h1 className="font-heading font-bold text-xl text-white">Admin</h1>
          {stats && stats.pendingModeration > 0 && (
            <span className="ml-auto h-5 px-2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center">
              {stats.pendingModeration}
            </span>
          )}
        </div>
        <div className="flex rounded-xl bg-white/5 p-1 gap-1">
          {([
            { key: 'moderation' as Tab, label: '🛡️ Moderation' },
            { key: 'stats' as Tab, label: '📊 Analytics' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-heading font-semibold transition-all ${tab === key ? 'bg-brand-gold text-brand-green' : 'text-silver hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {tab === 'stats' && (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: 'Total Staff', value: stats.totalStaff.toLocaleString(), color: 'text-brand-green-light' },
                    { icon: DollarSign, label: 'Active Subs', value: stats.activeSubscriptions.toLocaleString(), color: 'text-brand-gold' },
                    { icon: BarChart3, label: 'MRR', value: formatKes(stats.mrr), color: 'text-brand-gold' },
                    { icon: Trophy, label: 'Competitions', value: String(stats.competitionsActive), color: 'text-orange-400' },
                    { icon: Shield, label: 'Total Ratings', value: stats.totalRatings.toLocaleString(), color: 'text-brand-green-light' },
                    { icon: Shield, label: 'Pending Queue', value: String(stats.pendingModeration), color: stats.pendingModeration > 0 ? 'text-red-400' : 'text-silver' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl bg-white/5 border border-white/8 p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-silver" />
                        <span className="text-xs text-silver">{label}</span>
                      </div>
                      <div className={`font-mono font-bold text-xl ${color}`}>{value}</div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        {tab === 'moderation' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : queue.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle size={40} className="text-brand-green-light mx-auto mb-3" />
                <div className="font-heading font-bold text-white">Queue is clear</div>
                <div className="text-silver text-sm mt-1">No items awaiting moderation</div>
              </div>
            ) : (
              queue.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-white/8 bg-white/4 p-3 flex items-center gap-3"
                >
                  <Avatar src={item.entityAvatar} name={item.entityName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{item.entityName}</div>
                    <div className="text-xs text-silver">{item.type.replace('_', ' ')} · {item.reason}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handle(item, 'approve')}
                      disabled={processingId === item.id}
                      className="h-8 w-8 rounded-full bg-brand-green/20 text-brand-green-light hover:bg-brand-green/30 flex items-center justify-center transition-colors"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      onClick={() => handle(item, 'reject')}
                      disabled={processingId === item.id}
                      className="h-8 w-8 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
