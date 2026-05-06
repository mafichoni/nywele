import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Globe, Bell, Shield, Info, LogOut, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import i18n from '@/i18n'

interface TogglePref {
  label: string
  desc: string
  value: boolean
  set: (v: boolean) => void
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [lang, setLang] = useState(i18n.language === 'sw' ? 'sw' : 'en')
  const [pushRatings, setPushRatings] = useState(true)
  const [pushSubscription, setPushSubscription] = useState(true)
  const [pushCompetitions, setPushCompetitions] = useState(false)
  const [pushMarketing, setPushMarketing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  function switchLanguage(code: 'en' | 'sw') {
    setLang(code)
    i18n.changeLanguage(code)
    toast(`Language switched to ${code === 'en' ? 'English' : 'Kiswahili'}`, 'success')
  }

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    logout()
    navigate('/auth', { replace: true })
  }

  const notifToggles: TogglePref[] = [
    { label: 'New ratings & reviews', desc: 'When someone rates your service', value: pushRatings, set: setPushRatings },
    { label: 'Subscription reminders', desc: 'Before your listing expires', value: pushSubscription, set: setPushSubscription },
    { label: 'Competition updates', desc: 'Voting open, results, prizes', value: pushCompetitions, set: setPushCompetitions },
    { label: 'Promotions & offers', desc: 'Flash sales and marketplace deals', value: pushMarketing, set: setPushMarketing },
  ]

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-onyx/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading font-black text-white text-lg">Settings</h1>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Language */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-silver uppercase tracking-wider">
            <Globe size={13} /> Language
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/5">
            {([['en', 'English', '🇬🇧'], ['sw', 'Kiswahili', '🇰🇪']] as const).map(([code, label, flag]) => (
              <motion.button
                key={code}
                whileTap={{ scale: 0.98 }}
                onClick={() => switchLanguage(code)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors text-left"
              >
                <span className="text-lg">{flag}</span>
                <span className="flex-1 text-sm text-white">{label}</span>
                {lang === code && (
                  <div className="w-2 h-2 rounded-full bg-brand-gold" />
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-silver uppercase tracking-wider">
            <Bell size={13} /> Notifications
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/5">
            {notifToggles.map(({ label, desc, value, set }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1">
                  <div className="text-sm text-white">{label}</div>
                  <div className="text-xs text-silver">{desc}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={value}
                  onClick={() => set(!value)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-brand-green' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy & Account */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-silver uppercase tracking-wider">
            <Shield size={13} /> Privacy & Account
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/5">
            {[
              { label: 'Phone number', value: user?.phone ?? '' },
              { label: 'Account role', value: user?.role?.toLowerCase().replace('_', ' ') ?? '' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-white">{label}</span>
                <span className="text-sm text-silver">{value}</span>
              </div>
            ))}
            <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors text-left opacity-50 cursor-not-allowed">
              <span className="flex-1 text-sm text-white">Delete account</span>
              <ChevronRight size={14} className="text-silver/50" />
            </button>
          </div>
        </section>

        {/* About */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-silver uppercase tracking-wider">
            <Info size={13} /> About
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/5">
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Build', value: '2026.05' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm text-white">{label}</span>
                <span className="text-sm text-silver font-mono">{value}</span>
              </div>
            ))}
            <a
              href="https://nywele.app/privacy"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors"
            >
              <span className="flex-1 text-sm text-white">Privacy Policy</span>
              <ChevronRight size={14} className="text-silver/50" />
            </a>
            <a
              href="https://nywele.app/terms"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/4 transition-colors"
            >
              <span className="flex-1 text-sm text-white">Terms of Service</span>
              <ChevronRight size={14} className="text-silver/50" />
            </a>
          </div>
        </section>

        <Button variant="danger" fullWidth size="md" loading={loggingOut} onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </Button>

        <p className="text-center text-[10px] text-silver/30">Built in Africa 🌍 · Nywele © 2026</p>
      </div>
    </div>
  )
}
