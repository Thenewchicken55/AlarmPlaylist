import { useCallback, useEffect, useRef, useState } from 'react'
import type ReactHowler from 'react-howler'
import { usePlayerStore } from '../../stores/playerStore'
import { getAudioUrl } from '../../db/audioStorage'
import { youtubePlayer } from '../../services/youtubePlayer'
import { inferFormat } from '../../utils/audio'
import { toast } from 'sonner'

/**
 * Encapsulates all audio-engine wiring (YouTube IFrame + Howler) for the current
 * track: loading, progress tracking, volume/playpause sync, buffering state,
 * stall detection, and skip-on-error. Returns the bits the renderer needs to
 * draw the actual <ReactHowler> element.
 */
export function useTrackPlayback() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setBuffering = usePlayerStore((s) => s.setBuffering)
  const next = usePlayerStore((s) => s.next)

  const [url, setUrl] = useState<string | undefined>()
  const [format, setFormat] = useState<string[] | undefined>()
  const howlerRef = useRef<ReactHowler | null>(null)
  const animFrameRef = useRef<number>(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const trackIdRef = useRef(currentTrack?.id)
  const skipCountRef = useRef(0)
  const lastSkipTimeRef = useRef(0)
  const lastProgressRef = useRef(0)
  const lastAdvanceRef = useRef(0)

  const isYouTube = currentTrack?.source === 'youtube'

  function skipWithWarning(trackTitle: string, reason: string) {
    const now = Date.now()
    if (now - lastSkipTimeRef.current > 2000) {
      skipCountRef.current = 0
    }
    skipCountRef.current++
    lastSkipTimeRef.current = now

    console.warn(`Skipping "${trackTitle}": ${reason}`)

    if (skipCountRef.current <= 3) {
      toast.warning(`Skipped "${trackTitle}" — ${reason}`)
    } else if (skipCountRef.current === 4) {
      toast.warning('Skipping more tracks with missing audio data...')
    }

    const { queue } = usePlayerStore.getState()
    if (skipCountRef.current >= queue.length) {
      toast.error('No playable tracks found — audio files may need to be re-imported')
      usePlayerStore.getState().stop()
      return
    }

    setTimeout(() => next(), 50)
  }

  // Track-change effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(undefined)
    setFormat(undefined)
    trackIdRef.current = currentTrack?.id

    if (!currentTrack) return

    const track = currentTrack
    let cancelled = false

    if (track.source === 'youtube' && track.sourceId) {
      youtubePlayer.load(track.sourceId, {
        onLoad: () => {
          if (cancelled || trackIdRef.current !== track.id) return
          skipCountRef.current = 0
          const dur = youtubePlayer.duration()
          if (dur > 0) setDuration(dur)

          if (usePlayerStore.getState().isPlaying) {
            youtubePlayer.play()
          }
        },
        onBuffering: (buffering) => {
          if (cancelled || trackIdRef.current !== track.id) return
          setBuffering(buffering)
        },
        onEnd: () => {
          if (cancelled) return
          skipCountRef.current = 0
          next()
        },
        onLoadError: (err) => {
          console.error('YouTube load error:', track.title, err)
          if (cancelled || trackIdRef.current !== track.id) return
          const msg = err instanceof Error ? err.message : 'YouTube: failed to load'
          skipWithWarning(track.title, msg)
        },
        onPlayError: (err) => {
          console.error('YouTube play error:', track.title, err)
        },
      })
    } else {
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

        skipCountRef.current = 0
        setUrl(resolvedUrl)
        const fmt = inferFormat(resolvedUrl)
        setFormat(fmt ? [fmt] : undefined)
      }

      resolveUrl()
    }

    return () => {
      cancelled = true
      if (track.source === 'youtube') {
        youtubePlayer.unload()
      }
      setBuffering(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  // Progress tracking
  useEffect(() => {
    if (isYouTube && isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setProgress(youtubePlayer.progress())
        const dur = youtubePlayer.duration()
        if (dur > 0) setDuration(dur)
      }, 250)
      return () => clearInterval(progressIntervalRef.current)
    }

    function updateProgress() {
      const h = howlerRef.current?.howler
      if (!h) return
      const seek = h.seek() as number
      const dur = h.duration()
      setProgress(dur > 0 ? (seek / dur) * 100 : 0)
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }

    if (!isYouTube && isPlaying && url) {
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }

    return () => cancelAnimationFrame(animFrameRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, url, isYouTube, setProgress])

  // Stall watchdog — if playback makes no progress for 30s (and isn't buffering),
  // skip the track so a dead stream doesn't sit silent forever.
  useEffect(() => {
    lastProgressRef.current = 0
    lastAdvanceRef.current = Date.now()

    if (!isPlaying) return

    const watchdog = setInterval(() => {
      if (!usePlayerStore.getState().isPlaying) return
      const p = usePlayerStore.getState().progress
      if (p !== lastProgressRef.current) {
        lastProgressRef.current = p
        lastAdvanceRef.current = Date.now()
      } else if (usePlayerStore.getState().isBuffering) {
        lastAdvanceRef.current = Date.now()
      } else if (Date.now() - lastAdvanceRef.current > 30000) {
        clearInterval(watchdog)
        skipWithWarning(currentTrack?.title ?? 'Unknown', 'playback stalled (no progress)')
      }
    }, 5000)

    return () => clearInterval(watchdog)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack?.id])

  // Volume sync for YouTube
  useEffect(() => {
    if (isYouTube) {
      youtubePlayer.setVolume(volume)
    }
  }, [volume, isYouTube])

  // Play/pause sync for YouTube
  useEffect(() => {
    if (!isYouTube) return
    if (isPlaying) {
      youtubePlayer.play()
    } else {
      youtubePlayer.pause()
    }
  }, [isPlaying, isYouTube])

  const seek = useCallback(
    (percent: number) => {
      if (isYouTube) {
        youtubePlayer.seek(percent)
        setProgress(percent)
        return
      }

      const h = howlerRef.current?.howler
      if (!h) return
      const pos = (percent / 100) * h.duration()
      h.seek(pos)
      setProgress(percent)
    },
    [setProgress, isYouTube],
  )

  return { url, format, howlerRef, isYouTube, seek, skip: skipWithWarning }
}
