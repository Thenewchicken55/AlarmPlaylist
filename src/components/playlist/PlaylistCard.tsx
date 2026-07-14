import { useState } from 'react'
import { Music, MoreVertical, Download, Trash2 } from 'lucide-react'
import type { Playlist } from '../../types'
import { pluralize } from '../../utils/format'
import { generateM3U } from '../../utils/playlistParser'

interface PlaylistCardProps {
  playlist: Playlist
  onClick: () => void
  onDelete: () => void
}

export default function PlaylistCard({ playlist, onClick, onDelete }: PlaylistCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  function handleExport() {
    const m3u = generateM3U(playlist.tracks)
    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${playlist.name}.m3u`
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }

  return (
    <div className="relative">
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick()
        }}
        className="w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-800/50"
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
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-2 z-50 w-40 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
            <button
              onClick={handleExport}
              disabled={playlist.tracks.length === 0}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
            >
              <Download size={14} />
              Export M3U
            </button>
            <button
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-slate-800"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
