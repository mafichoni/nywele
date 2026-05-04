import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2 } from 'lucide-react'
import { StarRating } from '@/components/ui/StarRating'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { ratingsApi } from '@/lib/api'
import { vibrate } from '@/lib/utils'
import type { StaffProfile, ServiceCategory } from '@/types'

const SERVICE_OPTIONS: { value: ServiceCategory; label: string }[] = [
  { value: 'haircut', label: 'Haircut' },
  { value: 'hair_colour', label: 'Hair Colour' },
  { value: 'braids', label: 'Braids' },
  { value: 'locs', label: 'Locs' },
  { value: 'massage_swedish', label: 'Swedish Massage' },
  { value: 'massage_deep_tissue', label: 'Deep Tissue Massage' },
  { value: 'nails_acrylic', label: 'Acrylic Nails' },
  { value: 'nails_gel', label: 'Gel Nails' },
  { value: 'pedicure', label: 'Pedicure' },
  { value: 'manicure', label: 'Manicure' },
  { value: 'facial', label: 'Facial' },
  { value: 'makeup_bridal', label: 'Bridal Makeup' },
  { value: 'makeup_everyday', label: 'Everyday Makeup' },
  { value: 'waxing', label: 'Waxing' },
]

interface Props {
  staff: StaffProfile
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RatingModal({ staff, open, onClose, onSuccess }: Props) {
  const { toast } = useToast()
  const [service, setService] = useState<ServiceCategory | ''>('')
  const [score, setScore] = useState(0)
  const [review, setReview] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!service || score === 0) {
      toast('Please select a service and give a score.', 'error')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('staffId', staff.id)
      fd.append('serviceCategory', service)
      fd.append('score', String(score))
      if (review) fd.append('review', review)
      if (image) fd.append('image', image)
      await ratingsApi.submitServiceRating(fd)
      vibrate([50, 30, 80])
      const xp = image ? 70 : 40
      toast(`Rating submitted! You earned ${xp} Taste Points. ✨`, 'success')
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg?.includes('already rated')) {
        toast('You already rated this service this week.', 'error')
      } else {
        toast('Could not submit rating. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
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
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-onyx border-t border-white/10 p-6 pb-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Avatar src={staff.user.avatar} name={staff.user.name} size="md" />
                <div>
                  <div className="font-heading font-bold text-white">Rate {staff.user.name}</div>
                  <div className="text-xs text-silver">{staff.city}</div>
                </div>
              </div>
              <button onClick={onClose} className="text-silver hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Service select */}
              <div>
                <label className="block text-sm text-silver mb-1.5">Service</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value as ServiceCategory)}
                  className="w-full rounded-xl bg-white/8 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold/50 appearance-none"
                >
                  <option value="">Select service...</option>
                  {SERVICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Stars */}
              <div>
                <label className="block text-sm text-silver mb-2">Your Score</label>
                <div className="flex items-center gap-3">
                  <StarRating score={score} interactive onChange={setScore} size="lg" />
                  {score > 0 && (
                    <motion.span
                      key={score}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-brand-gold font-mono font-bold text-lg"
                    >
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][score]}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Photo */}
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-brand-green-light hover:text-brand-gold transition-colors"
                >
                  <Camera size={16} />
                  {preview ? 'Change Photo' : 'Add Photo (optional)'}
                  <span className="text-[10px] text-brand-gold ml-1">+30 pts bonus</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2 relative"
                  >
                    <img src={preview} alt="Preview" className="h-32 w-32 rounded-xl object-cover border border-white/10" />
                    <button
                      type="button"
                      onClick={() => { setImage(null); setPreview(null) }}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Review text */}
              <div>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience... (optional)"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-xl bg-white/8 border border-white/10 text-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold/50 resize-none placeholder-white/30"
                />
              </div>

              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                loading={submitting}
                disabled={!service || score === 0}
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
