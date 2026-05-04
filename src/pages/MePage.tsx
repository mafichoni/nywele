import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, LogOut, Star, Crown, ChevronRight, Bell, Globe } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { BadgeList } from '@/components/ui/BadgeChip'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/lib/supabase'
import { formatPoints } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'

export default function MePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const staffProfile = useAuthStore((s) => s.staffProfile)
  const clientProfile = useAuthStore((s) => s.clientProfile)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!user) navigate('/auth', { replace: true })
  }, [user])

  async function handleLogout() {
    await signOut()
    logout()
    navigate('/auth', { replace: true })
  }

  if (!user) return null

  const isStaff = user.role === 'STAFF'
  const profile = isStaff ? staffProfile : clientProfile

  const menuItems = [
    { icon: Star, label: 'My Ratings', to: '/me/ratings' },
    { icon: Bell, label: 'Notifications', to: '/me/notifications' },
    { icon: Settings, label: 'Settings', to: '/me/settings' },
  ]

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/8 bg-white/4 p-5 space-y-4"
      >
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} name={user.name} size="xl" ring="gold" />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-black text-white text-xl truncate">{user.name}</h1>
            <div className="text-sm text-silver capitalize">{user.role.toLowerCase().replace('_', ' ')}</div>
            {isStaff && staffProfile && (
              <div className="text-sm text-brand-gold font-mono font-bold mt-1">
                {formatPoints(staffProfile.totalPoints)} pts
              </div>
            )}
            {!isStaff && clientProfile && (
              <div className={`text-sm font-bold mt-1 ${
                clientProfile.tasteTier === 'GOLD' ? 'text-brand-gold' :
                clientProfile.tasteTier === 'SILVER' ? 'text-silver' :
                clientProfile.tasteTier === 'PLATINUM' ? 'text-purple-400' :
                'text-orange-400'
              }`}>
                {clientProfile.tasteTier} Client · {clientProfile.tastePoints} Taste Points
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/me/edit')}>
            Edit
          </Button>
        </div>

        {/* Staff stats */}
        {isStaff && staffProfile && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Points', value: formatPoints(staffProfile.totalPoints), color: 'text-brand-gold' },
                { label: 'Avg Rating', value: staffProfile.avgRating.toFixed(1), color: 'text-brand-green-light' },
                { label: 'Reviews', value: String(staffProfile.reviewCount), color: 'text-white' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/5 p-2.5 text-center">
                  <div className={`font-mono font-bold text-lg ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-silver">{s.label}</div>
                </div>
              ))}
            </div>

            {staffProfile.badgeIds.length > 0 && (
              <BadgeList badgeIds={staffProfile.badgeIds} max={5} />
            )}

            {/* Subscription status */}
            <div className={`rounded-xl p-3 flex items-center gap-3 ${
              staffProfile.subscriptionTier === 'FEATURED' ? 'bg-brand-gold/10 border border-brand-gold/30' :
              staffProfile.subscriptionTier === 'BASIC' ? 'bg-brand-green/10 border border-brand-green/30' :
              'bg-white/5 border border-white/8'
            }`}>
              <Crown size={18} className={
                staffProfile.subscriptionTier === 'FEATURED' ? 'text-brand-gold' :
                staffProfile.subscriptionTier === 'BASIC' ? 'text-brand-green-light' :
                'text-silver'
              } />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">
                  {staffProfile.subscriptionTier === 'NONE' ? 'No active plan' :
                   staffProfile.subscriptionTier === 'BASIC' ? 'Basic Listing' : 'Featured Listing'}
                </div>
                {staffProfile.subscriptionValidUntil && (
                  <div className="text-xs text-silver">
                    Valid until {new Date(staffProfile.subscriptionValidUntil).toLocaleDateString('en-KE')}
                  </div>
                )}
              </div>
              <Button
                variant={staffProfile.subscriptionTier === 'NONE' ? 'gold' : 'secondary'}
                size="sm"
                onClick={() => navigate(`/staff/${staffProfile.id}`)}
              >
                {staffProfile.subscriptionTier === 'NONE' ? 'Activate' : 'Manage'}
              </Button>
            </div>
          </>
        )}

        {/* View public profile */}
        {isStaff && staffProfile && (
          <Button variant="secondary" fullWidth size="md" onClick={() => navigate(`/staff/${staffProfile.id}`)}>
            View Public Profile
          </Button>
        )}
      </motion.div>

      {/* Menu */}
      <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/5">
        {menuItems.map(({ icon: Icon, label, to }, i) => (
          <motion.button
            key={to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors text-left"
          >
            <Icon size={18} className="text-silver" />
            <span className="flex-1 text-sm text-white">{label}</span>
            <ChevronRight size={14} className="text-silver/50" />
          </motion.button>
        ))}

        {/* Language toggle */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors"
          onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'sw' : 'en')}
        >
          <Globe size={18} className="text-silver" />
          <span className="flex-1 text-sm text-white">Language</span>
          <span className="text-xs text-brand-gold font-bold uppercase">{i18n.language === 'en' ? 'English' : 'Kiswahili'}</span>
        </button>
      </div>

      {/* Logout */}
      <Button variant="danger" fullWidth size="md" onClick={handleLogout}>
        <LogOut size={16} /> Sign Out
      </Button>

      <p className="text-center text-[10px] text-silver/40">Nywele v1.0 · Built in Africa 🌍</p>
    </div>
  )
}
