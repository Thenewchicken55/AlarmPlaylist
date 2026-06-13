import { Play, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../../stores/playerStore'
import AlbumArt from '../player/AlbumArt'
import TrackInfo from '../player/TrackInfo'

export default function MiniPlayer() {
  const navigate = useNavigate()
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)

  if (!currentTrack) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:bottom-0 md:left-60">
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={() => navigate('/player')} className="flex flex-1 items-center gap-3 min-w-0">
          <AlbumArt track={currentTrack} size="sm" />
          <TrackInfo track={currentTrack} compact />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume() }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 1 }} />}
          </button>
        </div>
      </div>
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-200"
          style={{ width: `${duration > 0 ? (progress / 100) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}
