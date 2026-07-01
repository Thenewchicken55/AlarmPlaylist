import { create } from 'zustand'
import type { Page } from '../types'

type Theme = 'system' | 'light' | 'dark'

interface UIState {
  currentPage: Page
  sidebarOpen: boolean
  theme: Theme
  installPromptEvent: Event | null

  setPage: (page: Page) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  setInstallPrompt: (event: Event | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'alarms',
  sidebarOpen: false,
  theme: (localStorage.getItem('theme') as Theme) ?? 'system',
  installPromptEvent: null,

  setPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
  setInstallPrompt: (event) => set({ installPromptEvent: event }),
}))
