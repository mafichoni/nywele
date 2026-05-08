import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Scissors, Trophy, ShoppingBag,
  CreditCard, Shield, ArrowLeft, RefreshCw, Trash2, Edit2,
  CheckCircle, XCircle, Crown, ChevronDown, Plus, Package,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { formatKes, formatRelativeTime, BADGE_META, SPECIALTY_META } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'staff' | 'competitions' | 'payments' | 'orders' | 'moderation'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',      label: 'Overview',     icon: LayoutDashboard },
  { key: 'users',         label: 'Users',        icon: Users },
  { key: 'staff',         label: 'Staff',        icon: Scissors },
  { key: 'competitions',  label: 'Competitions', icon: Trophy },
  { key: 'payments',      label: 'Payments',     icon: CreditCard },
  { key: 'orders',        label: 'Orders',       icon: ShoppingBag },
  { key: 'moderation',    label: 'Moderation',   icon: Shield },
]

const ROLE_COLORS: Record<string, string> = {
  ADMIN:        'text-purple-400 bg-purple-400/10 border-purple-400/30',
  STAFF:        'text-brand-gold bg-brand-gold/10 border-brand-gold/30',
  CLIENT:       'text-brand-green-light bg-brand-green-light/10 border-brand-green-light/30',
  OUTLET_ADMIN: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  SELLER:       'text-orange-400 bg-orange-400/10 border-orange-400/30',
}

const TIER_COLORS: Record<string, string> = {
  FEATURED: 'text-brand-gold',
  BASIC:    'text-brand-green-light',
  NONE:     'text-silver',
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'text-yellow-400 bg-yellow-400/10',
  paid:       'text-blue-400 bg-blue-400/10',
  processing: 'text-orange-400 bg-orange-400/10',
  shipped:    'text-purple-400 bg-purple-400/10',
  delivered:  'text-brand-green-light bg-brand-green-light/10',
  cancelled:  'text-red-400 bg-red-400/10',
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/8 p-3 space-y-0.5">
      <div className={`font-mono font-bold text-xl ${color}`}>{value}</div>
      <div className="text-xs text-silver">{label}</div>
      {sub && <div className="text-[10px] text-silver/60">{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-heading font-black text-white text-base">{title}</h2>
      {action}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-12 space-y-2">
      <div className="text-4xl">{icon}</div>
      <div className="text-silver text-sm">{text}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)

  // ── Overview
  const [stats, setStats] = useState<Record<string, number> | null>(null)

  // ── Users
  const [users, setUsers] = useState<any[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersQ, setUsersQ] = useState('')
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editRole, setEditRole] = useState('')

  // ── Staff
  const [staff, setStaff] = useState<any[]>([])
  const [staffTotal, setStaffTotal] = useState(0)
  const [staffPage, setStaffPage] = useState(1)
  const [staffQ, setStaffQ] = useState('')
  const [editingStaff, setEditingStaff] = useState<any | null>(null)

  // ── Competitions
  const [competitions, setCompetitions] = useState<any[]>([])
  const [showNewComp, setShowNewComp] = useState(false)
  const [compForm, setCompForm] = useState({
    title: '', description: '', category: 'haircut',
    entryFeeKes: '500', prizePool: '10000',
    entryOpenDate: '', entryCloseDate: '',
    votingOpenDate: '', votingCloseDate: '',
  })

  // ── Payments
  const [payments, setPayments] = useState<any[]>([])
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [paymentsPage, setPaymentsPage] = useState(1)

  // ── Orders
  const [orders, setOrders] = useState<any[]>([])
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersPage, setOrdersPage] = useState(1)

  // ── Moderation
  const [modItems, setModItems] = useState<any[]>([])

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/admin/stats')
    setStats(data)
  }, [])

  const fetchUsers = useCallback(async (page = 1, q = '') => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users', { params: { page, q: q || undefined } })
      setUsers(page === 1 ? data.users : (prev: any[]) => [...prev, ...data.users])
      setUsersTotal(data.total)
    } finally { setLoading(false) }
  }, [])

  const fetchStaff = useCallback(async (page = 1, q = '') => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/staff', { params: { page, q: q || undefined } })
      setStaff(page === 1 ? data.staff : (prev: any[]) => [...prev, ...data.staff])
      setStaffTotal(data.total)
    } finally { setLoading(false) }
  }, [])

  const fetchCompetitions = useCallback(async () => {
    const { data } = await api.get('/admin/competitions')
    setCompetitions(data.competitions)
  }, [])

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/payments', { params: { page } })
      setPayments(page === 1 ? data.payments : (prev: any[]) => [...prev, ...data.payments])
      setPaymentsTotal(data.total)
    } finally { setLoading(false) }
  }, [])

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/orders', { params: { page } })
      setOrders(page === 1 ? data.orders : (prev: any[]) => [...prev, ...data.orders])
      setOrdersTotal(data.total)
    } finally { setLoading(false) }
  }, [])

  const fetchModeration = useCallback(async () => {
    const { data } = await api.get('/admin/moderation')
    setModItems(data.items)
  }, [])

  useEffect(() => {
    if (tab === 'overview') fetchStats()
    else if (tab === 'users') { setUsersPage(1); fetchUsers(1, usersQ) }
    else if (tab === 'staff') { setStaffPage(1); fetchStaff(1, staffQ) }
    else if (tab === 'competitions') fetchCompetitions()
    else if (tab === 'payments') { setPaymentsPage(1); fetchPayments(1) }
    else if (tab === 'orders') { setOrdersPage(1); fetchOrders(1) }
    else if (tab === 'moderation') fetchModeration()
  }, [tab])

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleUpdateUserRole() {
    if (!editingUser || !editRole) return
    try {
      await api.patch(`/admin/users/${editingUser.id}`, { role: editRole })
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, role: editRole } : u))
      setEditingUser(null)
      toast('Role updated', 'success')
    } catch { toast('Failed to update role', 'error') }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      toast('User deleted', 'success')
    } catch { toast('Failed to delete user', 'error') }
  }

  async function handleSetSubscription(staffId: string, tier: string) {
    const months = tier !== 'NONE' ? 1 : 0
    const validUntil = months
      ? new Date(Date.now() + months * 30 * 86400000).toISOString()
      : undefined
    try {
      await api.patch(`/admin/staff/${staffId}/subscription`, { tier, validUntil })
      setStaff((prev) => prev.map((s) => s.id === staffId
        ? { ...s, subscriptionTier: tier, subscriptionValidUntil: validUntil ?? null }
        : s))
      toast('Subscription updated', 'success')
    } catch { toast('Failed to update subscription', 'error') }
  }

  async function handleVerifyStaff(staffId: string, verified: boolean) {
    try {
      await api.patch(`/admin/staff/${staffId}/verify`, { verified })
      setStaff((prev) => prev.map((s) => s.id === staffId ? { ...s, verified } : s))
      toast(verified ? 'Staff verified' : 'Verification removed', 'success')
    } catch { toast('Failed to update verification', 'error') }
  }

  async function handleAwardBadge(staffId: string, badge: string) {
    try {
      await api.post(`/admin/staff/${staffId}/badge`, { badge })
      setStaff((prev) => prev.map((s) => s.id === staffId && !s.badgeIds.includes(badge)
        ? { ...s, badgeIds: [...s.badgeIds, badge] }
        : s))
      toast('Badge awarded', 'success')
    } catch { toast('Failed to award badge', 'error') }
  }

  async function handleRemoveBadge(staffId: string, badge: string) {
    try {
      await api.delete(`/admin/staff/${staffId}/badge/${badge}`)
      setStaff((prev) => prev.map((s) => s.id === staffId
        ? { ...s, badgeIds: s.badgeIds.filter((b: string) => b !== badge) }
        : s))
      toast('Badge removed', 'success')
    } catch { toast('Failed to remove badge', 'error') }
  }

  async function handleCreateCompetition() {
    try {
      await api.post('/admin/competitions', {
        ...compForm,
        entryFeeKes: Number(compForm.entryFeeKes),
        prizePool: Number(compForm.prizePool),
      })
      await fetchCompetitions()
      setShowNewComp(false)
      setCompForm({ title: '', description: '', category: 'haircut', entryFeeKes: '500', prizePool: '10000', entryOpenDate: '', entryCloseDate: '', votingOpenDate: '', votingCloseDate: '' })
      toast('Competition created!', 'success')
    } catch { toast('Failed to create competition', 'error') }
  }

  async function handleDeleteCompetition(id: string, title: string) {
    if (!confirm(`Delete competition "${title}"?`)) return
    try {
      await api.delete(`/admin/competitions/${id}`)
      setCompetitions((prev) => prev.filter((c) => c.id !== id))
      toast('Competition deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  async function handleUpdateCompetitionStatus(id: string, status: string) {
    try {
      await api.patch(`/admin/competitions/${id}`, { status })
      setCompetitions((prev) => prev.map((c) => c.id === id ? { ...c, status } : c))
      toast('Status updated', 'success')
    } catch { toast('Failed to update status', 'error') }
  }

  async function handleUpdateOrderStatus(id: string, status: string) {
    try {
      await api.patch(`/admin/orders/${id}`, { status })
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
      toast('Order status updated', 'success')
    } catch { toast('Failed to update order', 'error') }
  }

  async function handleModApprove(type: string, id: string) {
    try {
      await api.post(`/admin/moderation/${type}/${id}/approve`)
      setModItems((prev) => prev.filter((m) => m.id !== id))
      toast('Approved', 'success')
    } catch { toast('Failed', 'error') }
  }

  async function handleModReject(type: string, id: string) {
    try {
      await api.post(`/admin/moderation/${type}/${id}/reject`, { reason: 'Admin rejection' })
      setModItems((prev) => prev.filter((m) => m.id !== id))
      toast('Rejected & removed', 'success')
    } catch { toast('Failed', 'error') }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🚫</div>
          <div className="text-white font-semibold">Admin access required</div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/discover')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-onyx/95 backdrop-blur-md border-b border-white/8">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="font-heading font-black text-white text-base">Super Admin</div>
            <div className="text-[10px] text-brand-gold font-mono">{user.phone}</div>
          </div>
          <button onClick={() => {
            if (tab === 'overview') fetchStats()
            else if (tab === 'users') fetchUsers(usersPage, usersQ)
            else if (tab === 'staff') fetchStaff(staffPage, staffQ)
            else if (tab === 'competitions') fetchCompetitions()
            else if (tab === 'payments') fetchPayments(paymentsPage)
            else if (tab === 'orders') fetchOrders(ordersPage)
            else fetchModeration()
          }} className="text-silver hover:text-white">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-none px-2 gap-1 pb-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === key
                  ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30'
                  : 'text-silver hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >

            {/* ── OVERVIEW ─────────────────────────────────────────────── */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <SectionHeader title="Platform Overview" />
                {!stats ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Total Users" value={stats.totalUsers} color="text-white" />
                      <StatCard label="Staff Profiles" value={stats.totalStaff} color="text-brand-gold" />
                      <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} color="text-brand-green-light" />
                      <StatCard label="New Users (7d)" value={stats.newUsersThisWeek} color="text-blue-400" />
                      <StatCard label="Monthly Revenue" value={`KES ${(stats.mrr / 1000).toFixed(1)}k`} color="text-brand-gold" sub="this month" />
                      <StatCard label="Total Revenue" value={`KES ${(stats.totalRevenue / 1000).toFixed(1)}k`} color="text-purple-400" />
                      <StatCard label="Total Ratings" value={stats.totalRatings} color="text-silver" />
                      <StatCard label="Active Competitions" value={stats.competitionsActive} color="text-orange-400" />
                    </div>
                    {stats.pendingModeration > 0 && (
                      <button
                        onClick={() => setTab('moderation')}
                        className="w-full flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3"
                      >
                        <Shield size={16} className="text-red-400" />
                        <span className="text-sm text-red-300 flex-1 text-left">
                          {stats.pendingModeration} items need moderation
                        </span>
                        <ChevronDown size={14} className="text-red-400 -rotate-90" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── USERS ─────────────────────────────────────────────────── */}
            {tab === 'users' && (
              <div className="space-y-3">
                <SectionHeader title={`Users (${usersTotal})`} />
                <input
                  value={usersQ}
                  onChange={(e) => { setUsersQ(e.target.value); setUsersPage(1); fetchUsers(1, e.target.value) }}
                  placeholder="Search by name or phone..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
                />
                {loading && users.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                  : users.length === 0
                    ? <EmptyState icon="👥" text="No users found" />
                    : users.map((u) => (
                      <div key={u.id} className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar} name={u.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{u.name}</div>
                            <div className="text-xs text-silver font-mono">{u.phone}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${ROLE_COLORS[u.role] ?? 'text-silver'}`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-silver">
                          <span>{formatRelativeTime(u.createdAt)}</span>
                          {u.staffProfile && (
                            <span className={`${TIER_COLORS[u.staffProfile.subscriptionTier]}`}>
                              · {u.staffProfile.subscriptionTier}
                            </span>
                          )}
                          {u.clientProfile && (
                            <span className="text-brand-gold">· {u.clientProfile.tastePoints} pts</span>
                          )}
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={() => { setEditingUser(u); setEditRole(u.role) }}
                            className="flex items-center gap-1 text-xs text-silver hover:text-white bg-white/5 rounded-lg px-2 py-1"
                          >
                            <Edit2 size={11} /> Role
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 bg-red-500/5 rounded-lg px-2 py-1"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                }
                {users.length < usersTotal && (
                  <button onClick={() => { const p = usersPage + 1; setUsersPage(p); fetchUsers(p, usersQ) }}
                    className="w-full py-2 text-sm text-brand-gold">Load more</button>
                )}
              </div>
            )}

            {/* ── STAFF ─────────────────────────────────────────────────── */}
            {tab === 'staff' && (
              <div className="space-y-3">
                <SectionHeader title={`Staff (${staffTotal})`} />
                <input
                  value={staffQ}
                  onChange={(e) => { setStaffQ(e.target.value); setStaffPage(1); fetchStaff(1, e.target.value) }}
                  placeholder="Search by name..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
                />
                {loading && staff.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                  : staff.length === 0
                    ? <EmptyState icon="✂️" text="No staff profiles" />
                    : staff.map((s) => (
                      <div key={s.id} className={`rounded-xl border p-3 space-y-3 ${
                        editingStaff?.id === s.id ? 'bg-white/8 border-brand-gold/30' : 'bg-white/4 border-white/8'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Avatar src={s.user?.avatar} name={s.user?.name} size="sm"
                            ring={s.subscriptionTier === 'FEATURED' ? 'gold' : 'none'} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white truncate">{s.user?.name}</span>
                              {s.verified && <CheckCircle size={12} className="text-brand-green-light shrink-0" />}
                            </div>
                            <div className="text-xs text-silver">
                              {s.specialties?.slice(0, 2).map((sp: string) =>
                                SPECIALTY_META[sp as keyof typeof SPECIALTY_META]?.emoji
                              ).join(' ')} · {s.city}
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${TIER_COLORS[s.subscriptionTier]}`}>
                            {s.subscriptionTier}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          {[
                            { label: 'Points', value: s.totalPoints },
                            { label: 'Rating', value: s.avgRating?.toFixed(1) },
                            { label: 'Reviews', value: s.reviewCount },
                          ].map((stat) => (
                            <div key={stat.label} className="bg-white/5 rounded-lg p-1.5">
                              <div className="text-white font-mono text-sm font-bold">{stat.value}</div>
                              <div className="text-[10px] text-silver">{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setEditingStaff(editingStaff?.id === s.id ? null : s)}
                            className="text-xs px-2 py-1 rounded-lg bg-white/5 text-silver hover:text-white"
                          >
                            <Edit2 size={11} className="inline mr-1" />Manage
                          </button>
                          <button
                            onClick={() => handleVerifyStaff(s.id, !s.verified)}
                            className={`text-xs px-2 py-1 rounded-lg ${s.verified ? 'bg-red-500/10 text-red-400' : 'bg-brand-green-light/10 text-brand-green-light'}`}
                          >
                            {s.verified ? 'Unverify' : 'Verify'}
                          </button>
                        </div>

                        {editingStaff?.id === s.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-1 border-t border-white/8">
                            {/* Subscription */}
                            <div className="space-y-1.5">
                              <div className="text-xs text-silver uppercase tracking-wider">Subscription</div>
                              <div className="flex gap-2">
                                {(['NONE', 'BASIC', 'FEATURED'] as const).map((tier) => (
                                  <button
                                    key={tier}
                                    onClick={() => handleSetSubscription(s.id, tier)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      s.subscriptionTier === tier
                                        ? tier === 'FEATURED' ? 'bg-brand-gold text-brand-green'
                                          : tier === 'BASIC' ? 'bg-brand-green-light text-brand-green'
                                          : 'bg-white/20 text-white'
                                        : 'bg-white/5 text-silver hover:bg-white/10'
                                    }`}
                                  >
                                    {tier}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="space-y-1.5">
                              <div className="text-xs text-silver uppercase tracking-wider">Badges</div>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(BADGE_META).map(([id, meta]) => {
                                  const has = s.badgeIds?.includes(id)
                                  return (
                                    <button
                                      key={id}
                                      onClick={() => has ? handleRemoveBadge(s.id, id) : handleAwardBadge(s.id, id)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-colors ${
                                        has
                                          ? 'bg-brand-gold/20 border border-brand-gold/40 text-brand-gold'
                                          : 'bg-white/5 border border-white/10 text-silver hover:text-white'
                                      }`}
                                    >
                                      {meta.emoji} {meta.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))
                }
                {staff.length < staffTotal && (
                  <button onClick={() => { const p = staffPage + 1; setStaffPage(p); fetchStaff(p, staffQ) }}
                    className="w-full py-2 text-sm text-brand-gold">Load more</button>
                )}
              </div>
            )}

            {/* ── COMPETITIONS ─────────────────────────────────────────── */}
            {tab === 'competitions' && (
              <div className="space-y-3">
                <SectionHeader
                  title="Competitions"
                  action={
                    <button onClick={() => setShowNewComp(!showNewComp)}
                      className="flex items-center gap-1 text-xs text-brand-gold hover:text-brand-gold/80">
                      <Plus size={14} /> New
                    </button>
                  }
                />

                {/* New competition form */}
                <AnimatePresence>
                  {showNewComp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-white/5 border border-brand-gold/30 p-3 space-y-2"
                    >
                      <div className="text-xs font-bold text-brand-gold uppercase tracking-wider">New Competition</div>
                      {[
                        { key: 'title', label: 'Title', type: 'text' },
                        { key: 'description', label: 'Description', type: 'text' },
                        { key: 'entryFeeKes', label: 'Entry Fee (KES)', type: 'number' },
                        { key: 'prizePool', label: 'Prize Pool (KES)', type: 'number' },
                        { key: 'entryOpenDate', label: 'Entry Opens', type: 'datetime-local' },
                        { key: 'entryCloseDate', label: 'Entry Closes', type: 'datetime-local' },
                        { key: 'votingOpenDate', label: 'Voting Opens', type: 'datetime-local' },
                        { key: 'votingCloseDate', label: 'Voting Closes', type: 'datetime-local' },
                      ].map(({ key, label, type }) => (
                        <div key={key} className="space-y-0.5">
                          <label className="text-[10px] text-silver uppercase tracking-wider">{label}</label>
                          <input
                            type={type}
                            value={compForm[key as keyof typeof compForm]}
                            onChange={(e) => setCompForm((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-brand-gold/50"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="secondary" fullWidth onClick={() => setShowNewComp(false)}>Cancel</Button>
                        <Button size="sm" variant="gold" fullWidth onClick={handleCreateCompetition}>Create</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {competitions.length === 0
                  ? <EmptyState icon="🏆" text="No competitions yet" />
                  : competitions.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{c.title}</div>
                          <div className="text-xs text-silver mt-0.5">{c.category.replace(/_/g, ' ')} · {c._count?.entries ?? 0} entries</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          c.status === 'voting' ? 'bg-brand-gold/20 text-brand-gold' :
                          c.status === 'entry_open' ? 'bg-brand-green-light/20 text-brand-green-light' :
                          c.status === 'closed' ? 'bg-white/10 text-silver' :
                          'bg-blue-400/20 text-blue-400'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="text-xs text-silver">
                        Prize: <span className="text-brand-gold font-bold">{formatKes(c.prizePool)}</span>
                        {' · '}Entry: {formatKes(c.entryFeeKes)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(['upcoming', 'entry_open', 'voting', 'closed', 'prizes_paid'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleUpdateCompetitionStatus(c.id, s)}
                            className={`text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                              c.status === s ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/5 text-silver hover:text-white'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                        <button onClick={() => handleDeleteCompetition(c.id, c.title)}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 ml-auto">
                          <Trash2 size={10} className="inline mr-0.5" />Delete
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── PAYMENTS ──────────────────────────────────────────────── */}
            {tab === 'payments' && (
              <div className="space-y-3">
                <SectionHeader title={`Payments (${paymentsTotal})`} />
                {loading && payments.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                  : payments.length === 0
                    ? <EmptyState icon="💳" text="No payments yet" />
                    : payments.map((p) => (
                      <div key={p.id} className="rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{formatKes(p.amount)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              p.status === 'success' ? 'bg-brand-green-light/20 text-brand-green-light' :
                              p.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
                              'bg-red-400/20 text-red-400'
                            }`}>{p.status}</span>
                          </div>
                          <div className="text-xs text-silver truncate">
                            {p.user?.name ?? 'Unknown'} · {p.tier} · {p.user?.phone}
                          </div>
                        </div>
                        <div className="text-[10px] text-silver/60 shrink-0">{formatRelativeTime(p.createdAt)}</div>
                      </div>
                    ))
                }
                {payments.length < paymentsTotal && (
                  <button onClick={() => { const p = paymentsPage + 1; setPaymentsPage(p); fetchPayments(p) }}
                    className="w-full py-2 text-sm text-brand-gold">Load more</button>
                )}
              </div>
            )}

            {/* ── ORDERS ────────────────────────────────────────────────── */}
            {tab === 'orders' && (
              <div className="space-y-3">
                <SectionHeader title={`Orders (${ordersTotal})`} />
                {loading && orders.length === 0
                  ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                  : orders.length === 0
                    ? <EmptyState icon="📦" text="No orders yet" />
                    : orders.map((o) => (
                      <div key={o.id} className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white">{formatKes(o.totalKes)}</div>
                            <div className="text-xs text-silver truncate">{o.client?.name} · {o.client?.phone}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${ORDER_STATUS_COLORS[o.status] ?? 'text-silver'}`}>
                            {o.status}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {o.items?.map((item: any) => (
                            <div key={item.productId} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-0.5">
                              {item.product?.images?.[0] && (
                                <img src={item.product.images[0]} alt="" className="w-4 h-4 rounded object-cover" />
                              )}
                              <span className="text-[10px] text-silver truncate max-w-24">{item.product?.name}</span>
                              <span className="text-[10px] text-white/50">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleUpdateOrderStatus(o.id, s)}
                              className={`text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                                o.status === s
                                  ? `${ORDER_STATUS_COLORS[s]} border border-current/30`
                                  : 'bg-white/5 text-silver hover:text-white'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                }
                {orders.length < ordersTotal && (
                  <button onClick={() => { const p = ordersPage + 1; setOrdersPage(p); fetchOrders(p) }}
                    className="w-full py-2 text-sm text-brand-gold">Load more</button>
                )}
              </div>
            )}

            {/* ── MODERATION ───────────────────────────────────────────── */}
            {tab === 'moderation' && (
              <div className="space-y-3">
                <SectionHeader title={`Moderation Queue (${modItems.length})`} />
                {modItems.length === 0
                  ? <EmptyState icon="✅" text="All clear — nothing to moderate" />
                  : modItems.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white/4 border border-white/8 p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar src={item.entityAvatar} name={item.entityName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{item.entityName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-white/10 text-silver rounded px-1.5 py-0.5">
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-silver">{item.reason}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-silver/60 shrink-0">{formatRelativeTime(item.createdAt)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModApprove(item.type, item.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-brand-green-light/10 border border-brand-green-light/30 text-brand-green-light rounded-lg py-1.5 text-xs font-semibold hover:bg-brand-green-light/20"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleModReject(item.type, item.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg py-1.5 text-xs font-semibold hover:bg-red-500/20"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Role-edit modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
            onClick={(e) => e.target === e.currentTarget && setEditingUser(null)}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full max-w-sm rounded-2xl bg-onyx border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Avatar src={editingUser.avatar} name={editingUser.name} size="md" />
                <div>
                  <div className="font-semibold text-white">{editingUser.name}</div>
                  <div className="text-xs text-silver">{editingUser.phone}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-silver uppercase tracking-wider">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CLIENT', 'STAFF', 'OUTLET_ADMIN', 'SELLER', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setEditRole(r)}
                      className={`py-2 rounded-xl text-sm font-bold transition-colors border ${
                        editRole === r ? ROLE_COLORS[r] : 'border-white/8 bg-white/5 text-silver'
                      }`}
                    >
                      {r === 'ADMIN' && <Crown size={11} className="inline mr-1" />}
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth size="md" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button variant="gold" fullWidth size="md" onClick={handleUpdateUserRole}>Save</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
