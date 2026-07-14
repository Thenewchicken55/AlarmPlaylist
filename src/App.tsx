import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppShell from './components/layout/AppShell'
import AlarmAlertOverlay from './components/alarm/AlarmAlertOverlay'
import { useTheme } from './hooks/useTheme'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCrossTabSync } from './hooks/useCrossTabSync'
import { useDSTRecalc } from './hooks/useDSTRecalc'
import { useAlarmScheduler } from './hooks/useAlarmScheduler'
import { useAlarmStore } from './stores/alarmStore'
import { usePlaylistStore } from './stores/playlistStore'
import { alarmScheduler } from './services/alarmScheduler'
import YouTubePlayerHost from './components/player/YouTubePlayerHost'
import AlarmPage from './pages/AlarmPage'
import PlaylistsPage from './pages/PlaylistsPage'
import PlaylistDetailPage from './pages/PlaylistDetailPage'
import PlayerPage from './pages/PlayerPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  useTheme()
  useKeyboardShortcuts()
  useCrossTabSync()
  useDSTRecalc()
  useAlarmScheduler()

  const loadAlarms = useAlarmStore((s) => s.loadAlarms)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const alarms = useAlarmStore((s) => s.alarms)

  useEffect(() => {
    loadAlarms()
  }, [loadAlarms])
  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  useEffect(() => {
    function handleSWMessage(event: MessageEvent) {
      if (event.data?.type === 'PERIODIC_ALARM_CHECK') {
        alarmScheduler.rescheduleAll(alarms)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
  }, [alarms])
  return (
    <>
      <YouTubePlayerHost />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/alarms" replace />} />
          <Route path="/alarms" element={<AlarmPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/player" element={<PlayerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
      <Toaster position="bottom-center" />
      <AlarmAlertOverlay />
    </>
  )
}
