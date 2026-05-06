import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { staffApi, usersApi } from '@/lib/api'
import { SPECIALTY_META } from '@/lib/utils'
import type { Specialty, ServiceMenuItem } from '@/types'

const SPECIALTIES = Object.keys(SPECIALTY_META) as Specialty[]

const SERVICE_CATEGORIES = [
  'haircut', 'hair_colour', 'braids', 'locs', 'weave', 'relaxer', 'blow_dry',
  'facial', 'massage_swedish', 'massage_deep_tissue', 'massage_hot_stone', 'massage_sports',
  'nails_acrylic', 'nails_gel', 'nails_natural', 'pedicure', 'manicure',
  'makeup_bridal', 'makeup_everyday', 'eyebrows', 'waxing',
]

const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale']

interface NewMenuItem {
  category: string
  name: string
  description: string
  priceMin: string
  priceMax: string
  durationMinutes: string
}

const EMPTY_MENU_ITEM: NewMenuItem = {
  category: 'haircut', name: '', description: '', priceMin: '', priceMax: '', durationMinutes: '',
}

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const staffProfile = useAuthStore((s) => s.staffProfile)
  const clientProfile = useAuthStore((s) => s.clientProfile)
  const setUser = useAuthStore((s) => s.setUser)
  const setStaffProfile = useAuthStore((s) => s.setStaffProfile)

  const isStaff = user?.role === 'STAFF'

  const [name, setName] = useState(user?.name ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [bio, setBio] = useState(staffProfile?.bio ?? '')
  const [city, setCity] = useState(staffProfile?.city ?? 'Nairobi')
  const [specialties, setSpecialties] = useState<Specialty[]>(staffProfile?.specialties ?? [])
  const [freelance, setFreelance] = useState(staffProfile?.freelance ?? false)
  const [mobileService, setMobileService] = useState(staffProfile?.mobileService ?? false)
  const [mobileRadiusKm, setMobileRadiusKm] = useState(String(staffProfile?.mobileRadiusKm ?? 10))
  const [menuItems, setMenuItems] = useState<ServiceMenuItem[]>(staffProfile?.serviceMenuItems ?? [])
  const [newItem, setNewItem] = useState<NewMenuItem>(EMPTY_MENU_ITEM)
  const [addingItem, setAddingItem] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingMenuItem, setAddingMenuItem] = useState(false)

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const { data: userData } = await usersApi.updateMe({ name, avatar: avatar || undefined })
      setUser(userData.user)

      if (isStaff && staffProfile) {
        const { data: staffData } = await staffApi.updateProfile(staffProfile.id, {
          bio, city, specialties,
          freelance, mobileService,
          mobileRadiusKm: mobileService ? Number(mobileRadiusKm) : undefined,
        })
        setStaffProfile({ ...staffProfile, ...staffData.staff })
      }

      toast('Profile saved!', 'success')
      navigate(-1)
    } catch {
      toast('Failed to save profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMenuItem() {
    if (!staffProfile || !newItem.name) return
    setAddingMenuItem(true)
    try {
      const { data } = await staffApi.addMenuItem(staffProfile.id, {
        category: newItem.category,
        name: newItem.name,
        description: newItem.description || undefined,
        priceMin: newItem.priceMin ? Number(newItem.priceMin) : undefined,
        priceMax: newItem.priceMax ? Number(newItem.priceMax) : undefined,
        durationMinutes: newItem.durationMinutes ? Number(newItem.durationMinutes) : undefined,
      })
      setMenuItems((prev) => [...prev, data.item])
      setNewItem(EMPTY_MENU_ITEM)
      setAddingItem(false)
      toast('Service added!', 'success')
    } catch {
      toast('Failed to add service.', 'error')
    } finally {
      setAddingMenuItem(false)
    }
  }

  async function handleDeleteMenuItem(itemId: string) {
    if (!staffProfile) return
    try {
      await staffApi.deleteMenuItem(staffProfile.id, itemId)
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId))
      toast('Service removed.', 'success')
    } catch {
      toast('Failed to remove service.', 'error')
    }
  }

  if (!user) return null

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-onyx/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-silver hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-heading font-black text-white text-lg flex-1">Edit Profile</h1>
        <Button size="sm" variant="gold" loading={saving} onClick={handleSave}>
          Save
        </Button>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Avatar preview */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Avatar src={avatar || null} name={name} size="xl" ring="gold" />
          <div className="flex-1 space-y-2">
            <label className="text-xs text-silver uppercase tracking-wider">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
              placeholder="Your name"
            />
          </div>
        </motion.div>

        {/* Avatar URL */}
        <div className="space-y-1.5">
          <label className="text-xs text-silver uppercase tracking-wider">Avatar URL</label>
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
            placeholder="https://... (paste image URL)"
          />
        </div>

        {isStaff && (
          <>
            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs text-silver uppercase tracking-wider">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50 resize-none"
                placeholder="Tell clients about yourself and your skills..."
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs text-silver uppercase tracking-wider">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
              >
                {CITIES.map((c) => <option key={c} value={c} className="bg-onyx">{c}</option>)}
              </select>
            </div>

            {/* Specialties */}
            <div className="space-y-2">
              <label className="text-xs text-silver uppercase tracking-wider">Specialties</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => {
                  const meta = SPECIALTY_META[s]
                  const selected = specialties.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-brand-gold/20 border border-brand-gold/50 text-brand-gold'
                          : 'bg-white/5 border border-white/8 text-silver hover:text-white'
                      }`}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-3">
              <label className="text-xs text-silver uppercase tracking-wider">Availability</label>
              {[
                { label: 'Freelance Professional', value: freelance, set: setFreelance },
                { label: 'Mobile Service (I travel to clients)', value: mobileService, set: setMobileService },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/8 px-4 py-3 cursor-pointer">
                  <span className="text-sm text-white">{label}</span>
                  <button
                    role="switch"
                    aria-checked={value}
                    onClick={() => set(!value)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-brand-green' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
              ))}

              {mobileService && (
                <div className="space-y-1.5 pl-2">
                  <label className="text-xs text-silver">Travel radius (km)</label>
                  <input
                    type="number"
                    value={mobileRadiusKm}
                    onChange={(e) => setMobileRadiusKm(e.target.value)}
                    min={1} max={100}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-brand-gold/50"
                  />
                </div>
              )}
            </div>

            {/* Service Menu */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-silver uppercase tracking-wider">Service Menu</label>
                <button
                  onClick={() => setAddingItem(true)}
                  className="flex items-center gap-1 text-xs text-brand-gold hover:text-brand-gold/80"
                >
                  <Plus size={14} /> Add Service
                </button>
              </div>

              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                    <div className="text-xs text-silver">
                      {item.priceMin != null && `KES ${item.priceMin}${item.priceMax ? `–${item.priceMax}` : '+'}`}
                      {item.durationMinutes && ` · ${item.durationMinutes} min`}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMenuItem(item.id)} className="text-red-400/70 hover:text-red-400 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {addingItem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2"
                >
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-onyx">
                        {c.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Service name *"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                  />
                  <input
                    value={newItem.description}
                    onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newItem.priceMin}
                      onChange={(e) => setNewItem((p) => ({ ...p, priceMin: e.target.value }))}
                      placeholder="Min price (KES)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                    />
                    <input
                      type="number"
                      value={newItem.priceMax}
                      onChange={(e) => setNewItem((p) => ({ ...p, priceMax: e.target.value }))}
                      placeholder="Max price"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                    />
                    <input
                      type="number"
                      value={newItem.durationMinutes}
                      onChange={(e) => setNewItem((p) => ({ ...p, durationMinutes: e.target.value }))}
                      placeholder="mins"
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" fullWidth onClick={() => { setAddingItem(false); setNewItem(EMPTY_MENU_ITEM) }}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="gold" fullWidth loading={addingMenuItem} onClick={handleAddMenuItem}>
                      Add
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}

        {!isStaff && clientProfile && (
          <div className="rounded-xl bg-white/5 border border-white/8 p-4 space-y-1">
            <div className="text-xs text-silver uppercase tracking-wider mb-2">Taste Profile</div>
            <div className={`text-lg font-bold ${
              clientProfile.tasteTier === 'GOLD' ? 'text-brand-gold' :
              clientProfile.tasteTier === 'PLATINUM' ? 'text-purple-400' :
              clientProfile.tasteTier === 'SILVER' ? 'text-silver' : 'text-orange-400'
            }`}>
              {clientProfile.tasteTier} Client
            </div>
            <div className="text-sm text-white/70">{clientProfile.tastePoints} Taste Points · {clientProfile.totalRatingsGiven} ratings given</div>
          </div>
        )}

        <Button variant="gold" fullWidth size="lg" loading={saving} onClick={handleSave}>
          Save Profile
        </Button>
      </div>
    </div>
  )
}
