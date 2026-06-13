import { Music, MoreVertical } from 'lucide-react'
import type { Playlist } from '../../types'
import { pluralize } from '../../utils/format'

interface PlaylistCardProps {
  playlist: Playlist
  onClick: () => void
}

export default function PlaylistCard({ playlist, onClick }: PlaylistCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-800/50"
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: playlist.color + '20' }}
        >
          <Music size={24} style={{ color: playlist.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-100">{playlist.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {playlist.tracks.length} {pluralize(playlist.tracks.length, 'track')}
            {' · '}
            <span className="capitalize">{playlist.source}</span>
          </p>
          {playlist.tracks.length > 0 && (
            <p className="mt-1 truncate text-xs text-slate-600">
              {playlist.tracks[0].title}
              {playlist.tracks.length > 1 && ` + ${playlist.tracks.length - 1} more`}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation() }}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </button>
  )
}
