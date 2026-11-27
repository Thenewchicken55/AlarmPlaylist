import ReactHowler from 'react-howler'
import { usePlayerStore } from '../../stores/playerStore'
import type { Playback } from './useTrackPlayback'

/**
 * Thin renderer. All playback logic lives in useTrackPlayback (owned by
 * PlaybackProvider); this component only mounts the <ReactHowler> element for
 * local audio (YouTube is rendered invisibly by the IFrame host).
 */
export default function AudioPlayer({ playback }: { playback: Playback }) {
  const { url, format, howlerRef, isYouTube, skip } = playback
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const next = usePlayerStore((s) => s.next)

  if (isYouTube) return null
  if (!url) return null

  return (
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
      onEnd={() => {
        // Howler ends a sound as soon as seek >= duration, so a finished howl
        // re-emits `end` the moment play() is called again. Rewind it first.
        howlerRef.current?.howler?.seek(0)
        next()
      }}
      onLoadError={(_id, err) => {
        console.error('Failed to load audio:', currentTrack?.title, err)
        if (usePlayerStore.getState().currentTrack?.id === currentTrack?.id) {
          skip(currentTrack?.title ?? 'Unknown', 'failed to load audio')
        }
      }}
    />
  )
}
