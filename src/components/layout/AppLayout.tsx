import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/ui/BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-onyx text-white font-body">
      <main className="mx-auto max-w-lg min-h-screen pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
