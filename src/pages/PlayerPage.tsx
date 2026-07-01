import { usePlayerStore } from '../stores/playerStore'
import AlbumArt from '../components/player/AlbumArt'
import TrackInfo from '../components/player/TrackInfo'
import ProgressBar from '../components/player/ProgressBar'
import PlaybackControls from '../components/player/PlaybackControls'
import VolumeSlider from '../components/player/VolumeSlider'

export default function PlayerPage() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const setProgress = usePlayerStore((s) => s.setProgress)

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
        <div className="text-center">
          <div className="mx-auto mb-6 h-48 w-48 rounded-2xl bg-slate-800" />
          <p className="text-xl font-medium text-slate-400">No track selected</p>
          <p className="mt-1 text-sm text-slate-600">Pick a song from your playlists</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-6 pt-8 pb-4" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8">
        <AlbumArt track={currentTrack} />

        <TrackInfo track={currentTrack} />

        <div className="w-full max-w-sm">
          <ProgressBar
            progress={progress}
            duration={duration}
            onSeek={setProgress}
          />
        </div>

        <PlaybackControls size="large" />

        <div className="mt-auto">
          <VolumeSlider />
        </div>
      </div>
    </div>
  )
}
