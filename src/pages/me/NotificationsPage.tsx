import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, Crown, Trophy, ThumbsUp, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Notification {
  id: string
  type: 'rating' | 'subscription' | 'competition' | 'upvote' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: string
}

const ICON_MAP = {
  rating: Star,
  subscription: Crown,
  competition: Trophy,
  upvote: ThumbsUp,
  system: Bell,
}

const COLOR_MAP = {
  rating: 'text-brand-gold bg-brand-gold/10',
  subscription: 'text-purple-400 bg-purple-400/10',
  competition: 'text-orange-400 bg-orange-400/10',
  upvote: 'text-brand-green-light bg-brand-green-light/10',
  system: 'text-silver bg-white/5',
}

function mockNotifications(role: string): Notification[] {
  const now = new Date()
  const mins = (n: number) => new Date(now.getTime() - n * 60000).toISOString()

  if (role === 'STAFF') {
    return [
      { id: '1', type: 'rating', title: 'New 5-star review!', body: 'A client left you a glowing review for your haircut service.', read: false, createdAt: mins(15) },
      { id: '2', type: 'upvote', title: 'Profile upvoted', body: 'Your profile received a new upvote this week.', read: false, createdAt: mins(45) },
      { id: '3', type: 'competition', title: 'Competition voting open', body: '"Best Braids Nairobi" is now accepting votes. You\'re entered!', read: true, createdAt: mins(180) },
      { id: '4', type: 'subscription', title: 'Listing expires in 3 days', body: 'Renew your Basic listing to stay visible in the discovery feed.', read: true, createdAt: mins(1440) },
    ]
  }

  return [
    { id: '1', type: 'system', title: 'Welcome to Nywele!', body: 'Discover top personal care professionals near you.', read: false, createdAt: mins(5) },
    { id: '2', type: 'competition', title: 'Vote in the competition', body: '"Best Nail Art Mombasa" is open for voting. Use your Taste Points!', read: true, createdAt: mins(240) },
    { id: '3', type: 'rating', title: 'Taste Points earned', body: 'You earned 40 Taste Points for your recent review.', read: true, createdAt: mins(1800) },
  ]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<Notification[]>(
    () => mockNotifications(user?.role ?? 'CLIENT')
  )

  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-onyx/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="font-heading font-black text-white text-lg">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-brand-gold">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-silver hover:text-white">
            Mark all read
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-2">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-3"
          >
            <div className="text-5xl">🔔</div>
            <div className="text-white font-semibold">All caught up!</div>
            <div className="text-silver text-sm">You have no notifications right now.</div>
          </motion.div>
        ) : (
          notifications.map((n, i) => {
            const Icon = ICON_MAP[n.type]
            const colors = COLOR_MAP[n.type]

            return (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => markRead(n.id)}
                className={`w-full text-left flex items-start gap-3 rounded-xl p-3 transition-colors ${
                  n.read ? 'bg-white/3 border border-white/5' : 'bg-white/6 border border-white/10'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colors}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${n.read ? 'text-white/70' : 'text-white'}`}>
                    {n.title}
                  </div>
                  <div className="text-xs text-silver mt-0.5 leading-relaxed">{n.body}</div>
                  <div className="text-[10px] text-silver/50 mt-1">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && (
                  <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-brand-gold" />
                )}
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}
