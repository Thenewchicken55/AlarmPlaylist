import { create } from 'zustand'

type Theme = 'system' | 'light' | 'dark'

interface UIState {
  theme: Theme
  installPromptEvent: Event | null

  setTheme: (theme: Theme) => void
  setInstallPrompt: (event: Event | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) ?? 'system',
  installPromptEvent: null,

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
  setInstallPrompt: (event) => set({ installPromptEvent: event }),
}))
