import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ArrowRight, RefreshCcw, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { setSession } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { api, authApi } from '@/lib/api'
import type { UserRole } from '@/types'

type Step = 'phone' | 'otp' | 'password' | 'role'

const ROLES: { role: UserRole; label: string; desc: string; emoji: string }[] = [
  { role: 'CLIENT',       label: "I'm a Client",      desc: 'Find & rate personal care professionals', emoji: '🌟' },
  { role: 'STAFF',        label: "I'm a Professional", desc: 'Barber, stylist, nail tech, masseur & more', emoji: '✂️' },
  { role: 'OUTLET_ADMIN', label: "I'm an Outlet",     desc: 'Salon, spa, barbershop or wellness centre', emoji: '🏢' },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const setUser = useAuthStore((s) => s.setUser)
  const setOnboarded = useAuthStore((s) => s.setOnboarded)

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendSecs, setResendSecs] = useState(0)

  useEffect(() => {
    if (resendSecs > 0) {
      const t = setTimeout(() => setResendSecs((s) => s - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendSecs])

  function formatPhone(raw: string) {
    return raw.startsWith('+') ? raw : `+254${raw.replace(/^0/, '')}`
  }

  async function sendOtp() {
    const formatted = formatPhone(phone)
    setLoading(true)
    try {
      const { data } = await authApi.requestOtp(formatted)
      if (data.mode === 'password') {
        setStep('password')
      } else {
        setStep('otp')
        setResendSecs(60)
        toast('Code sent — check Vercel logs if SMS is not configured.', 'success')
      }
    } catch {
      toast('Could not send code. Check the number and try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function adminLogin() {
    const formatted = formatPhone(phone)
    setLoading(true)
    try {
      const { data } = await authApi.adminLogin(formatted, password)
      const { error: sessionError } = await setSession(data.session.access_token, data.session.refresh_token)
      if (sessionError) throw sessionError
      try {
        const { data: profile } = await api.get('/users/me')
        setUser(profile.user)
        setOnboarded(true)
        navigate('/superadmin', { replace: true })
      } catch {
        toast('Login succeeded but profile load failed.', 'error')
      }
    } catch {
      toast('Invalid credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function confirmOtp() {
    const formatted = formatPhone(phone)
    setLoading(true)
    try {
      const { data } = await authApi.verifyOtp(formatted, otp)
      // Establish the Supabase session returned by the backend
      const { error: sessionError } = await setSession(data.session.access_token, data.session.refresh_token)
      if (sessionError) throw sessionError
      // Check if user already has a profile
      try {
        const { data: profile } = await api.get('/users/me')
        setUser(profile.user)
        setOnboarded(true)
        navigate('/discover', { replace: true })
      } catch {
        setStep('role')
      }
    } catch {
      toast('Invalid code. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function completeOnboarding() {
    if (!role) { toast('Please select your role.', 'error'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/users/onboard', { role })
      setUser(data.user)
      setOnboarded(true)
      navigate('/discover', { replace: true })
    } catch {
      toast('Could not complete setup. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center p-6">
      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="text-6xl mb-3">✂️</div>
        <h1 className="font-heading font-black text-5xl text-brand-gold tracking-tight">NYWELE</h1>
        <p className="text-brand-green-lighter/80 text-sm mt-2 font-body">Africa's Premier Personal Care Marketplace</p>
      </motion.div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm"
      >
        {step === 'phone' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading font-bold text-white text-2xl">Welcome!</h2>
              <p className="text-brand-green-lighter/70 text-sm mt-1">Enter your phone to get started</p>
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full rounded-2xl bg-white/10 border border-white/15 text-white pl-9 pr-4 py-3 text-base outline-none focus:border-brand-gold/60 placeholder-white/30"
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              />
            </div>
            <Button variant="gold" size="lg" fullWidth onClick={sendOtp} loading={loading}>
              Send Code <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading font-bold text-white text-2xl">Verify Code</h2>
              <p className="text-brand-green-lighter/70 text-sm mt-1">Code sent to {phone}</p>
            </div>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-2xl bg-white/10 border border-white/15 text-white text-center text-3xl tracking-[0.5em] py-4 outline-none focus:border-brand-gold/60 placeholder-white/20 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && confirmOtp()}
            />
            <Button variant="gold" size="lg" fullWidth onClick={confirmOtp} loading={loading} disabled={otp.length < 6}>
              Verify
            </Button>
            <button
              type="button"
              disabled={resendSecs > 0}
              onClick={sendOtp}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-brand-green-lighter/60 disabled:opacity-40 hover:text-brand-green-lighter transition-colors"
            >
              <RefreshCcw size={13} />
              {resendSecs > 0 ? `Resend in ${resendSecs}s` : 'Resend Code'}
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading font-bold text-white text-2xl">Admin Login</h2>
              <p className="text-brand-green-lighter/70 text-sm mt-1">Enter your admin password</p>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-2xl bg-white/10 border border-white/15 text-white pl-9 pr-4 py-3 text-base outline-none focus:border-brand-gold/60 placeholder-white/30"
                onKeyDown={(e) => e.key === 'Enter' && password.length > 0 && adminLogin()}
              />
            </div>
            <Button variant="gold" size="lg" fullWidth onClick={adminLogin} loading={loading} disabled={password.length === 0}>
              Sign In <ArrowRight size={16} />
            </Button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setPassword('') }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-brand-green-lighter/60 hover:text-brand-green-lighter transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading font-bold text-white text-2xl">I am a...</h2>
              <p className="text-brand-green-lighter/70 text-sm mt-1">Choose how you'll use Nywele</p>
            </div>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <motion.button
                  key={r.role}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setRole(r.role)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    role === r.role
                      ? 'border-brand-gold bg-brand-gold/15 shadow-lg shadow-brand-gold/10'
                      : 'border-white/15 bg-white/8 hover:bg-white/12'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.emoji}</span>
                    <div>
                      <div className={`font-heading font-bold text-base ${role === r.role ? 'text-brand-gold' : 'text-white'}`}>
                        {r.label}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">{r.desc}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            <Button variant="gold" size="lg" fullWidth onClick={completeOnboarding} loading={loading} disabled={!role}>
              Continue <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
