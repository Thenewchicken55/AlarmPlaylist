import { create } from 'zustand'
import type { Page } from '../types'

type Theme = 'system' | 'light' | 'dark'

interface UIState {
  currentPage: Page
  sidebarOpen: boolean
  theme: Theme
  installPromptEvent: Event | null
  toast: { message: string; type: 'success' | 'error' | 'info' } | null

  setPage: (page: Page) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  setInstallPrompt: (event: Event | null) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  dismissToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'alarms',
  sidebarOpen: false,
  theme: (localStorage.getItem('theme') as Theme) ?? 'system',
  installPromptEvent: null,
  toast: null,

  setPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
  setInstallPrompt: (event) => set({ installPromptEvent: event }),
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  dismissToast: () => set({ toast: null }),
}))
