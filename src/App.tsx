import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Toast from './components/ui/Toast'
import AlarmAlertOverlay from './components/alarm/AlarmAlertOverlay'
import { useTheme } from './hooks/useTheme'
import AlarmPage from './pages/AlarmPage'
import PlaylistsPage from './pages/PlaylistsPage'
import PlaylistDetailPage from './pages/PlaylistDetailPage'
import PlayerPage from './pages/PlayerPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  useTheme()
  return (
    <>
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
      <Toast />
      <AlarmAlertOverlay />
    </>
  )
}
