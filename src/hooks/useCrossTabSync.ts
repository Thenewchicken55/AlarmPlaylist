import { useEffect, useRef } from 'react'
import { useAlarmStore } from '../stores/alarmStore'
import { usePlaylistStore } from '../stores/playlistStore'
export function useCrossTabSync() {
  const loadAlarms = useAlarmStore((s) => s.loadAlarms)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const lastRef = useRef(0)

  useEffect(() => {
    function sync() {
      const now = Date.now()
      if (now - lastRef.current < 5000) return
      lastRef.current = now
      loadAlarms()
      loadPlaylists()
    }

    window.addEventListener('storage', sync)
    const interval = setInterval(sync, 10000)

    return () => {
      window.removeEventListener('storage', sync)
      clearInterval(interval)
    }
  }, [loadAlarms, loadPlaylists])
}
