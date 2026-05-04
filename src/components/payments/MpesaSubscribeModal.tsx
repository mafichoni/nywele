import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { mpesaApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { formatKes } from '@/lib/utils'

type PlanKey = 'staff_basic' | 'staff_featured' | 'outlet_basic' | 'outlet_featured' | 'seller'

const PLANS: Record<PlanKey, { label: string; price: number; perks: string[] }> = {
  staff_basic: {
    label: 'Staff Basic',
    price: 299,
    perks: ['Listed profile', 'Leaderboard entry', 'Up to 10 portfolio photos'],
  },
  staff_featured: {
    label: 'Staff Featured',
    price: 799,
    perks: ['Gold card & priority placement', 'Unlimited portfolio photos', 'Performance analytics', 'Shareable profile card with QR'],
  },
  outlet_basic: {
    label: 'Outlet Basic',
    price: 999,
    perks: ['Outlet profile & staff roster', 'Aggregate score display', 'Discovery listing'],
  },
  outlet_featured: {
    label: 'Outlet Featured',
    price: 2499,
    perks: ['Priority discovery & branded page', 'Hiring board access', 'Advanced analytics', 'Featured placement in search'],
  },
  seller: {
    label: 'Marketplace Seller',
    price: 499,
    perks: ['List unlimited products', '3% per transaction fee', 'Seller dashboard', 'Staff endorsement feature'],
  },
}

type PaymentState = 'select' | 'pending' | 'success' | 'failed'

interface Props {
  open: boolean
  onClose: () => void
  defaultPlan?: PlanKey
  entityId: string
  onSuccess?: () => void
}

export function MpesaSubscribeModal({ open, onClose, defaultPlan, entityId, onSuccess }: Props) {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(defaultPlan ?? 'staff_basic')
  const [paymentState, setPaymentState] = useState<PaymentState>('select')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [checkoutId, setCheckoutId] = useState<string | null>(null)

  const plan = PLANS[selectedPlan]

  async function handlePay() {
    if (!phone) { toast('Enter your M-PESA phone number.', 'error'); return }
    setPaymentState('pending')
    try {
      const res = await mpesaApi.initiateSubscription({ entityId, tier: selectedPlan, phone })
      setCheckoutId(res.data.CheckoutRequestID)
      // Poll for status
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        try {
          const status = await mpesaApi.checkSubscriptionStatus(res.data.CheckoutRequestID)
          if (status.data.status === 'success') {
            clearInterval(interval)
            setPaymentState('success')
            onSuccess?.()
          } else if (status.data.status === 'failed' || attempts > 30) {
            clearInterval(interval)
            setPaymentState('failed')
          }
        } catch {
          if (attempts > 30) {
            clearInterval(interval)
            setPaymentState('failed')
          }
        }
      }, 4000)
    } catch {
      setPaymentState('failed')
    }
  }

  function reset() {
    setPaymentState('select')
    setCheckoutId(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm rounded-3xl bg-onyx border border-white/10 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="font-heading font-bold text-white text-lg">Activate Listing</div>
              <button onClick={onClose} className="text-silver hover:text-white"><X size={18} /></button>
            </div>

            {paymentState === 'select' && (
              <div className="space-y-4">
                {/* Plan selector */}
                <div className="space-y-2">
                  {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedPlan(key)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        selectedPlan === key
                          ? 'border-brand-gold bg-brand-gold/10'
                          : 'border-white/8 bg-white/4 hover:bg-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-heading font-semibold text-sm ${selectedPlan === key ? 'text-brand-gold' : 'text-white'}`}>
                          {p.label}
                        </span>
                        <span className="font-mono font-bold text-brand-gold">{formatKes(p.price)}<span className="text-silver text-xs">/mo</span></span>
                      </div>
                      {selectedPlan === key && (
                        <ul className="mt-2 space-y-0.5">
                          {p.perks.map((perk) => (
                            <li key={perk} className="text-xs text-white/60 flex items-center gap-1.5">
                              <span className="text-brand-green-light">✓</span>{perk}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  ))}
                </div>

                {/* Phone input */}
                <div>
                  <label className="block text-xs text-silver mb-1">M-PESA Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="w-full rounded-xl bg-white/8 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold/50"
                  />
                </div>

                <Button variant="gold" size="lg" fullWidth onClick={handlePay}>
                  <Smartphone size={16} />
                  Pay {formatKes(plan.price)} via M-PESA
                </Button>
              </div>
            )}

            {paymentState === 'pending' && (
              <div className="text-center py-6 space-y-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-20 h-20 rounded-full bg-[#009c3a]/20 border-2 border-[#009c3a] mx-auto flex items-center justify-center"
                >
                  <Smartphone size={32} className="text-[#009c3a]" />
                </motion.div>
                <div>
                  <div className="font-heading font-bold text-white text-base">Check Your Phone</div>
                  <div className="text-sm text-silver mt-1">Enter your M-PESA PIN to complete payment</div>
                </div>
                <div className="text-xs text-silver/50">Waiting for confirmation...</div>
              </div>
            )}

            {paymentState === 'success' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-6 space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <CheckCircle size={56} className="text-brand-green-light mx-auto" />
                </motion.div>
                <div>
                  <div className="font-heading font-bold text-white text-lg">Payment Successful! 🎉</div>
                  <div className="text-sm text-silver mt-1">Your listing is now active.</div>
                </div>
                <Button variant="primary" fullWidth onClick={onClose}>Done</Button>
              </motion.div>
            )}

            {paymentState === 'failed' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-6 space-y-4"
              >
                <XCircle size={48} className="text-red-400 mx-auto" />
                <div>
                  <div className="font-heading font-bold text-white">Payment Failed</div>
                  <div className="text-sm text-silver mt-1">Please check your M-PESA balance and try again.</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
                  <Button variant="gold" fullWidth onClick={reset}>Retry</Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
