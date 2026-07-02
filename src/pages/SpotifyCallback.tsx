import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'
import { handleSpotifyCallback } from '../services/spotify'
import { toast } from 'sonner'

export default function SpotifyCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Authenticating with Spotify...')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('Authentication cancelled')
      toast.info('Spotify authentication cancelled')
      setTimeout(() => navigate('/playlists'), 2000)
      return
    }

    if (!code) {
      setStatus('No authorization code received')
      toast.error('Spotify authentication failed')
      setTimeout(() => navigate('/playlists'), 2000)
      return
    }

    handleSpotifyCallback(code).then((token) => {
      if (token) {
        toast.success('Spotify connected!')
        navigate('/playlists')
      } else {
        setStatus('Authentication failed')
        toast.error('Spotify authentication failed')
        setTimeout(() => navigate('/playlists'), 2000)
      }
    })
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
      <Spinner size={40} />
      <p className="text-slate-400">{status}</p>
    </div>
  )
}
