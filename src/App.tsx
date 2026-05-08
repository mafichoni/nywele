import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import AuthPage from '@/pages/AuthPage'
import DiscoverPage from '@/pages/DiscoverPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import StaffProfilePage from '@/pages/StaffProfilePage'
import CompetitionsPage from '@/pages/CompetitionsPage'
import MarketplacePage from '@/pages/MarketplacePage'
import CommunityPage from '@/pages/CommunityPage'
import MePage from '@/pages/MePage'
import EditProfilePage from '@/pages/me/EditProfilePage'
import RatingsPage from '@/pages/me/RatingsPage'
import NotificationsPage from '@/pages/me/NotificationsPage'
import SettingsPage from '@/pages/me/SettingsPage'
import AdminPage from '@/pages/AdminPage'
import SuperAdminPage from '@/pages/SuperAdminPage'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-green flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">✂️</div>
          <div className="font-heading font-black text-4xl text-brand-gold">NYWELE</div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  const setUser = useAuthStore((s) => s.setUser)
  const setStaffProfile = useAuthStore((s) => s.setStaffProfile)
  const setClientProfile = useAuthStore((s) => s.setClientProfile)
  const setLoading = useAuthStore((s) => s.setLoading)
  const setOnboarded = useAuthStore((s) => s.setOnboarded)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data } = await api.get('/users/me')
          setUser(data.user)
          if (data.staffProfile) setStaffProfile(data.staffProfile)
          if (data.clientProfile) setClientProfile(data.clientProfile)
          setOnboarded(true)
        } catch {
          setUser(null)
          setOnboarded(false)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/discover" replace />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/staff/:id" element={<StaffProfilePage />} />
        <Route path="/compete" element={<CompetitionsPage />} />
        <Route path="/market" element={<MarketplacePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/me/edit" element={<EditProfilePage />} />
        <Route path="/me/ratings" element={<RatingsPage />} />
        <Route path="/me/notifications" element={<NotificationsPage />} />
        <Route path="/me/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/superadmin" element={<SuperAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/discover" replace />} />
    </Routes>
  )
}
