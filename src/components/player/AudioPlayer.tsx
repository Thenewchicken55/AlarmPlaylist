import { useCallback, useEffect, useRef, useState } from 'react'
import ReactHowler from 'react-howler'
import { usePlayerStore } from '../../stores/playerStore'
import { getAudioUrl } from '../../db/audioStorage'
import AudioPlayerContext from './AudioPlayerContext'

function inferFormat(url: string): string[] | undefined {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (!ext) return undefined
  const known = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'webm'] as const
  return known.includes(ext as typeof known[number]) ? [ext] : undefined
}

export default function AudioPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const next = usePlayerStore((s) => s.next)

  const [url, setUrl] = useState<string | undefined>()
  const [format, setFormat] = useState<string[] | undefined>()
  const howlerRef = useRef<ReactHowler | null>(null)
  const animFrameRef = useRef<number>(0)

  // Track ID ref for guarding stale callbacks
  const trackIdRef = useRef(currentTrack?.id)

  // Resolve URL when track changes
  useEffect(() => {
    // Reset URL immediately to force ReactHowler to destroy the old Howl
    // (prevents stale onLoadError callbacks from cascading through the queue)
    setUrl(undefined)
    setFormat(undefined)
    trackIdRef.current = currentTrack?.id

    if (!currentTrack) return

    const track = currentTrack
    let cancelled = false

    async function resolveUrl() {
      let resolvedUrl: string | undefined
      if (track.blobId) {
        resolvedUrl = await getAudioUrl(track.blobId)
      } else {
        resolvedUrl = track.url
      }
      if (!resolvedUrl || cancelled) {
        if (!resolvedUrl && !cancelled) {
          console.warn('No audio URL for:', track.title, '- skipping')
          next()
        }
        return
      }

      setUrl(resolvedUrl)
      setFormat(inferFormat(resolvedUrl))
    }

    resolveUrl()
    return () => { cancelled = true }
  }, [currentTrack?.id])

  // Progress tracking
  useEffect(() => {
    function updateProgress() {
      const h = howlerRef.current?.howler
      if (!h) return
      const seek = h.seek() as number
      const dur = h.duration()
      const prog = dur > 0 ? (seek / dur) * 100 : 0
      setProgress(prog)
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }

    if (isPlaying && url) {
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, url, setProgress])

  const seek = useCallback((percent: number) => {
    const h = howlerRef.current?.howler
    if (!h) return
    const pos = (percent / 100) * h.duration()
    h.seek(pos)
    setProgress(percent)
  }, [setProgress])

  if (!url) return null

  return (
    <AudioPlayerContext value={{ seek }}>
      <ReactHowler
        ref={howlerRef}
        src={url}
        format={format}
        playing={isPlaying}
        volume={volume / 100}
        html5
        onLoad={() => {
          const dur = howlerRef.current?.howler?.duration() ?? 0
          setDuration(dur)
        }}
        onEnd={() => next()}
        onLoadError={(_id, err) => {
          console.error('Failed to load audio:', currentTrack?.title, err)
          if (trackIdRef.current !== currentTrack?.id) return
          next()
        }}
      />
    </AudioPlayerContext>
  )
}
