import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'
import { handleSpotifyCallback } from '../services/spotify'
import { useUIStore } from '../stores/uiStore'

export default function SpotifyCallback() {
  const navigate = useNavigate()
  const showToast = useUIStore((s) => s.showToast)
  const [status, setStatus] = useState('Authenticating with Spotify...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('Authentication cancelled')
      showToast('Spotify authentication cancelled', 'info')
      setTimeout(() => navigate('/playlists'), 2000)
      return
    }

    if (!code) {
      setStatus('No authorization code received')
      showToast('Spotify authentication failed', 'error')
      setTimeout(() => navigate('/playlists'), 2000)
      return
    }

    handleSpotifyCallback(code).then((token) => {
      if (token) {
        showToast('Spotify connected!', 'success')
        navigate('/playlists')
      } else {
        setStatus('Authentication failed')
        showToast('Spotify authentication failed', 'error')
        setTimeout(() => navigate('/playlists'), 2000)
      }
    })
  }, [navigate, showToast])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
      <Spinner size={40} />
      <p className="text-slate-400">{status}</p>
    </div>
  )
}
