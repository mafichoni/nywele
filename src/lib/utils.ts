import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BadgeId, Specialty, SubscriptionTier } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`
}

export function formatPoints(pts: number): string {
  if (pts >= 1000) return `${(pts / 1000).toFixed(1)}k`
  return pts.toString()
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'just now'
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export function formatCountdown(endDateStr: string): { days: number; hours: number; mins: number; secs: number; expired: boolean } {
  const end = new Date(endDateStr).getTime()
  const now = Date.now()
  const diff = end - now
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return { days, hours, mins, secs, expired: false }
}

export function scoreColor(score: number): string {
  if (score >= 4.5) return 'text-brand-gold'
  if (score >= 4.0) return 'text-brand-green-light'
  if (score >= 3.0) return 'text-yellow-400'
  return 'text-red-400'
}

export function tierColor(tier: SubscriptionTier): string {
  if (tier === 'FEATURED') return 'text-brand-gold'
  if (tier === 'BASIC') return 'text-brand-green-light'
  return 'text-silver'
}

export const BADGE_META: Record<BadgeId, { emoji: string; label: string; color: string }> = {
  crown:               { emoji: '👑', label: 'Crown',              color: 'from-yellow-400 to-brand-gold' },
  five_star:           { emoji: '⭐', label: '5-Star Pro',          color: 'from-brand-gold to-yellow-300' },
  photo_pro:           { emoji: '📸', label: 'Photo Pro',           color: 'from-purple-400 to-pink-400' },
  rising_star:         { emoji: '🚀', label: 'Rising Star',         color: 'from-blue-400 to-cyan-400' },
  competition_winner:  { emoji: '🏆', label: 'Competition Winner',  color: 'from-brand-gold to-orange-400' },
  mobile_pro:          { emoji: '📱', label: 'Mobile Pro',          color: 'from-brand-green-mid to-brand-green-light' },
  verified:            { emoji: '✅', label: 'Verified',            color: 'from-brand-green-mid to-brand-green-light' },
  placement_veteran:   { emoji: '🤝', label: 'Placement Veteran',   color: 'from-slate-400 to-slate-300' },
  mentor:              { emoji: '🎓', label: 'Mentor',              color: 'from-indigo-400 to-purple-400' },
}

export const SPECIALTY_META: Record<Specialty, { label: string; emoji: string }> = {
  barber:         { label: 'Barber',          emoji: '💈' },
  hair_stylist:   { label: 'Hair Stylist',    emoji: '💇' },
  nail_tech:      { label: 'Nail Tech',       emoji: '💅' },
  masseur:        { label: 'Masseur',         emoji: '💆' },
  spa_therapist:  { label: 'Spa Therapist',   emoji: '🧖' },
  beautician:     { label: 'Beautician',      emoji: '💄' },
  braider:        { label: 'Braider',         emoji: '🧶' },
  loctician:      { label: 'Loctician',       emoji: '🌿' },
  esthetician:    { label: 'Esthetician',     emoji: '🫧' },
  makeup_artist:  { label: 'Makeup Artist',   emoji: '🎨' },
  eyebrow_tech:   { label: 'Eyebrow Tech',    emoji: '✨' },
  pedicurist:     { label: 'Pedicurist',      emoji: '🦶' },
}

export function vibrate(pattern: number | number[] = 50) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

export function getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
  return (conn?.effectiveType as ReturnType<typeof getConnectionType>) ?? 'unknown'
}

export function imageQualityForConnection(): 'low' | 'medium' | 'high' {
  const type = getConnectionType()
  if (type === 'slow-2g' || type === '2g') return 'low'
  if (type === '3g') return 'medium'
  return 'high'
}

export function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}
