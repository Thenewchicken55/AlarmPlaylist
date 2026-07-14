import { useEffect, useRef } from 'react'
import { youtubePlayer } from '../../services/youtubePlayer'

export default function YouTubePlayerHost() {
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    youtubePlayer.init('youtube-player-host').catch((err) => {
      console.error('Failed to init YouTube player:', err)
    })

    return () => {
      youtubePlayer.destroy()
      initRef.current = false
    }
  }, [])

  return (
    <div
      id="youtube-player-host"
      aria-hidden
      className="pointer-events-none fixed left-[-9999px] top-0 h-px w-px opacity-0"
    />
  )
}
