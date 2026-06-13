import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../stores/playerStore'
import { audioPlayer } from '../services/player'
import { getAudioUrl } from '../db/audioStorage'

export function useAudioPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const next = usePlayerStore((s) => s.next)
  const stop = usePlayerStore((s) => s.stop)

  const animFrameRef = useRef<number>(0)
  const prevTrackIdRef = useRef<string | null>(null)

  // Track progress
  useEffect(() => {
    function updateProgress() {
      setProgress(audioPlayer.progress())
      if (audioPlayer.isPlaying()) {
        animFrameRef.current = requestAnimationFrame(updateProgress)
      }
    }

    if (isPlaying && currentTrack) {
      animFrameRef.current = requestAnimationFrame(updateProgress)
    }

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, currentTrack, setProgress])

  // Load and play track
  useEffect(() => {
    if (!currentTrack) {
      audioPlayer.stop()
      return
    }

    const trackId = currentTrack.id
    if (prevTrackIdRef.current === trackId && isPlaying && !audioPlayer.isPlaying()) {
      audioPlayer.play()
      return
    }

    prevTrackIdRef.current = trackId

    async function loadTrack() {
      let url = currentTrack.url
      if (!url && currentTrack.blobId) {
        url = await getAudioUrl(currentTrack.blobId)
      }
      if (!url) return

      audioPlayer.load(url, {
        onLoad: () => {
          setDuration(audioPlayer.duration())
          if (isPlaying) audioPlayer.play()
        },
        onEnd: () => next(),
        onError: () => stop(),
      })
    }

    loadTrack()
  }, [currentTrack?.id])

  // Play/pause
  useEffect(() => {
    if (!currentTrack) return
    if (isPlaying) {
      audioPlayer.play()
    } else {
      audioPlayer.pause()
    }
  }, [isPlaying])

  // Volume
  useEffect(() => {
    audioPlayer.setVolume(volume)
  }, [volume])
}
