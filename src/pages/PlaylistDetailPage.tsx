import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trash2, Upload } from 'lucide-react'
import TrackList from '../components/playlist/TrackList'
import Button from '../components/ui/Button'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import { useUIStore } from '../stores/uiStore'
import { pluralize } from '../utils/format'

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const playlists = usePlaylistStore((s) => s.playlists)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const removeTrack = usePlaylistStore((s) => s.removeTrack)
  const importLocalFiles = usePlaylistStore((s) => s.importLocalFiles)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)

  const playQueue = usePlayerStore((s) => s.playQueue)
  const currentTrack = usePlayerStore((s) => s.currentTrack)

  const showToast = useUIStore((s) => s.showToast)

  const playlist = playlists.find((p) => p.id === id)

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  if (!playlist) {
    return (
      <div className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
        <p className="text-slate-500">Playlist not found</p>
      </div>
    )
  }

  async function handleDelete() {
    if (confirm('Delete this playlist and all its tracks?')) {
      await deletePlaylist(playlist.id)
      showToast('Playlist deleted', 'info')
      navigate('/playlists')
    }
  }

  async function handleImport(files: FileList) {
    try {
      await importLocalFiles(playlist.id, files)
      showToast(`Imported ${files.length} ${pluralize(files.length, 'file')}`, 'success')
    } catch {
      showToast('Failed to import files', 'error')
    }
  }

  function handlePlayAll() {
    if (playlist.tracks.length > 0) {
      playQueue(playlist.tracks, 0)
      navigate('/player')
    }
  }

  function handlePlayTrack(_track: any, index: number) {
    playQueue(playlist.tracks, index)
    navigate('/player')
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/playlists')}
          className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: playlist.color + '20' }}
          >
            <Play size={28} style={{ color: playlist.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-100">{playlist.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {playlist.tracks.length} {pluralize(playlist.tracks.length, 'track')}
              {' · '}
              <span className="capitalize">{playlist.source}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={handlePlayAll} disabled={playlist.tracks.length === 0}>
                <Play size={16} />
                Play All
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Import
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <TrackList
        tracks={playlist.tracks}
        playlistId={playlist.id}
        currentTrackId={currentTrack?.id}
        onPlay={handlePlayTrack}
        onRemove={(trackId) => removeTrack(playlist.id, trackId)}
        onImportFiles={handleImport}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleImport(e.target.files)}
      />
    </div>
  )
}
