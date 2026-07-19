import ReactHowler from 'react-howler'
import { usePlayerStore } from '../../stores/playerStore'
import { useTrackPlayback } from './useTrackPlayback'
import AudioPlayerContext from './AudioPlayerContext'

/**
 * Thin renderer. All playback logic lives in useTrackPlayback; this component
 * only mounts the <ReactHowler> element for local audio (YouTube is rendered
 * invisibly by the IFrame host) and exposes `seek` to children via context.
 */
export default function AudioPlayer() {
  const { url, format, howlerRef, isYouTube, seek, skip } = useTrackPlayback()
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const next = usePlayerStore((s) => s.next)

  if (isYouTube) return null
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
        onEnd={() => {
          next()
        }}
        onLoadError={(_id, err) => {
          console.error('Failed to load audio:', currentTrack?.title, err)
          if (usePlayerStore.getState().currentTrack?.id === currentTrack?.id) {
            skip(currentTrack?.title ?? 'Unknown', 'failed to load audio')
          }
        }}
      />
    </AudioPlayerContext>
  )
}
