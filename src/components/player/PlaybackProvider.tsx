import type { ReactNode } from 'react'
import AudioPlayerContext from './AudioPlayerContext'
import AudioPlayer from './AudioPlayer'
import { useTrackPlayback } from './useTrackPlayback'

/**
 * Owns the single useTrackPlayback instance and publishes `seek` to the whole
 * app.
 *
 * It has to sit above the router: pages (ProgressBar) are rendered inside
 * <AppShell>, so a provider living inside <AudioPlayer> would only wrap the
 * invisible <ReactHowler> element and every page would read the no-op default
 * seek from AudioPlayerContext.
 */
export default function PlaybackProvider({ children }: { children: ReactNode }) {
  const playback = useTrackPlayback()

  return (
    <AudioPlayerContext value={{ seek: playback.seek }}>
      {children}
      <AudioPlayer playback={playback} />
    </AudioPlayerContext>
  )
}
