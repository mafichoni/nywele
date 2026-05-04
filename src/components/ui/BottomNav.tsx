import { NavLink } from 'react-router-dom'
import { Compass, Trophy, Swords, ShoppingBag, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

const TABS = [
  { to: '/discover',     icon: Compass,    label: 'Discover'     },
  { to: '/leaderboard',  icon: Trophy,     label: 'Leaderboard'  },
  { to: '/compete',      icon: Swords,     label: 'Compete'      },
  { to: '/market',       icon: ShoppingBag, label: 'Market'      },
  { to: '/me',           icon: User,       label: 'Me'           },
]

export function BottomNav() {
  const cartCount = useCartStore((s) => s.itemCount)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-lg bg-onyx/95 backdrop-blur-md border-t border-white/8 flex items-stretch">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-body font-medium transition-colors',
                isActive ? 'text-brand-gold' : 'text-silver hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-full bg-brand-gold/15 scale-150"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon size={20} className="relative z-10" />
                  {to === '/market' && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-4 w-4 rounded-full bg-brand-gold text-onyx text-[9px] font-bold flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
