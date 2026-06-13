import { type ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MiniPlayer from './MiniPlayer'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <MiniPlayer />
    </div>
  )
}
