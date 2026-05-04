import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, StaffProfile, ClientProfile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  staffProfile: StaffProfile | null
  clientProfile: ClientProfile | null
  isLoading: boolean
  isOnboarded: boolean
  setUser: (user: User | null) => void
  setStaffProfile: (profile: StaffProfile | null) => void
  setClientProfile: (profile: ClientProfile | null) => void
  setLoading: (loading: boolean) => void
  setOnboarded: (v: boolean) => void
  logout: () => void
  get role(): UserRole | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      staffProfile: null,
      clientProfile: null,
      isLoading: true,
      isOnboarded: false,

      setUser: (user) => set({ user }),
      setStaffProfile: (staffProfile) => set({ staffProfile }),
      setClientProfile: (clientProfile) => set({ clientProfile }),
      setLoading: (isLoading) => set({ isLoading }),
      setOnboarded: (isOnboarded) => set({ isOnboarded }),

      logout: () => set({ user: null, staffProfile: null, clientProfile: null, isOnboarded: false }),

      get role() {
        return get().user?.role ?? null
      },
    }),
    {
      name: 'nywele-auth',
      partialize: (state) => ({
        user: state.user,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
)
