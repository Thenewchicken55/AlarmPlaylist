import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

export function useInstallPrompt() {
  const setInstallPrompt = useUIStore((s) => s.setInstallPrompt)

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [setInstallPrompt])
}
