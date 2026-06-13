import { GripVertical, Play, Trash2, Music } from 'lucide-react'
import type { Track } from '../../types'
import { formatDuration } from '../../utils/time'

interface TrackRowProps {
  track: Track
  isPlaying?: boolean
  onPlay: () => void
  onRemove: () => void
}

export default function TrackRow({ track, isPlaying, onPlay, onRemove }: TrackRowProps) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isPlaying ? 'bg-indigo-600/10' : 'hover:bg-slate-800'
      }`}
    >
      <GripVertical size={16} className="cursor-grab text-slate-600 opacity-0 group-hover:opacity-100" />

      <button
        onClick={onPlay}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-indigo-600 hover:text-white"
      >
        {isPlaying ? (
          <span className="flex gap-0.5">
            <span className="h-3 w-0.5 animate-pulse rounded bg-indigo-400" />
            <span className="h-4 w-0.5 animate-pulse rounded bg-indigo-400" style={{ animationDelay: '0.2s' }} />
            <span className="h-2 w-0.5 animate-pulse rounded bg-indigo-400" style={{ animationDelay: '0.4s' }} />
          </span>
        ) : (
          <Play size={14} />
        )}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {track.thumbnail ? (
          <img src={track.thumbnail} alt="" className="h-9 w-9 flex-shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-slate-800">
            <Music size={16} className="text-slate-600" />
          </div>
        )}
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${isPlaying ? 'text-indigo-400' : 'text-slate-200'}`}>
            {track.title}
          </p>
          <p className="truncate text-xs text-slate-500">{track.artist}</p>
        </div>
      </div>

      <span className="flex-shrink-0 text-xs text-slate-500">{formatDuration(track.duration)}</span>

      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded-lg p-1.5 text-slate-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
