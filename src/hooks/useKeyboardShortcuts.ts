import { useEffect } from 'react'
import { usePlayerStore } from '../stores/playerStore'

export function useKeyboardShortcuts() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (!currentTrack) return
          isPlaying ? pause() : resume()
          break
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(100, volume + 5))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 5))
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setVolume(volume > 0 ? 0 : 70)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentTrack, isPlaying, pause, resume, next, prev, volume, setVolume])
}
