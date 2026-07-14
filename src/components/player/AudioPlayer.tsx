import { useCallback, useEffect, useRef, useState } from 'react'
import ReactHowler from 'react-howler'
import { usePlayerStore } from '../../stores/playerStore'
import { getAudioUrl } from '../../db/audioStorage'
import AudioPlayerContext from './AudioPlayerContext'
import { toast } from 'sonner'

function inferFormat(url: string): string[] | undefined {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (!ext) return undefined
  const known = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma', 'webm'] as const
  return known.includes(ext as (typeof known)[number]) ? [ext] : undefined
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

  // Track consecutive skip count to stop runaway cascades
  const skipCountRef = useRef(0)
  const lastSkipTimeRef = useRef(0)

  function skipWithWarning(trackTitle: string, reason: string) {
    const now = Date.now()
    // Reset skip counter if it's been more than 2 seconds since the last skip
    if (now - lastSkipTimeRef.current > 2000) {
      skipCountRef.current = 0
    }
    skipCountRef.current++
    lastSkipTimeRef.current = now

    console.warn(`Skipping "${trackTitle}": ${reason}`)

    // Show a toast for the first few skips, then a summary
    if (skipCountRef.current <= 3) {
      toast.warning(`Skipped "${trackTitle}" — ${reason}`)
    } else if (skipCountRef.current === 4) {
      toast.warning('Skipping more tracks with missing audio data...')
    }

    // Stop the cascade if we've skipped too many in a row
    const { queue } = usePlayerStore.getState()
    if (skipCountRef.current >= queue.length) {
      toast.error('No playable tracks found — audio files may need to be re-imported')
      usePlayerStore.getState().stop()
      return
    }

    // Small delay to prevent synchronous cascade that makes the UI unresponsive
    setTimeout(() => next(), 50)
  }

  // Resolve URL when track changes
  useEffect(() => {
    // Reset URL immediately to force ReactHowler to destroy the old Howl
    // (prevents stale onLoadError callbacks from cascading through the queue)
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      if (cancelled) return
      if (!resolvedUrl) {
        skipWithWarning(track.title, 'audio data missing (try re-importing)')
        return
      }

      // Reset skip counter on successful URL resolution
      skipCountRef.current = 0
      setUrl(resolvedUrl)
      setFormat(inferFormat(resolvedUrl))
    }

    resolveUrl()
    return () => {
      cancelled = true
    }
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

  const seek = useCallback(
    (percent: number) => {
      const h = howlerRef.current?.howler
      if (!h) return
      const pos = (percent / 100) * h.duration()
      h.seek(pos)
      setProgress(percent)
    },
    [setProgress],
  )

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
          // Successful load — reset skip counter
          skipCountRef.current = 0
          const dur = howlerRef.current?.howler?.duration() ?? 0
          setDuration(dur)
        }}
        onEnd={() => {
          // Normal track end — reset skip counter
          skipCountRef.current = 0
          next()
        }}
        onLoadError={(_id, err) => {
          console.error('Failed to load audio:', currentTrack?.title, err)
          if (trackIdRef.current !== currentTrack?.id) return
          skipWithWarning(currentTrack?.title ?? 'Unknown', 'failed to load audio')
        }}
      />
    </AudioPlayerContext>
  )
}
