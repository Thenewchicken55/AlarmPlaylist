import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Music } from 'lucide-react'
import PlaylistCard from '../components/playlist/PlaylistCard'
import CreatePlaylistModal from '../components/playlist/CreatePlaylistModal'
import { usePlaylistStore } from '../stores/playlistStore'
import { useUIStore } from '../stores/uiStore'

export default function PlaylistsPage() {
  const navigate = useNavigate()
  const playlists = usePlaylistStore((s) => s.playlists)
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist)
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists)
  const showToast = useUIStore((s) => s.showToast)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  async function handleDelete(id: string) {
    if (confirm('Delete this playlist and all its tracks?')) {
      await deletePlaylist(id)
      showToast('Playlist deleted', 'info')
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Playlists</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-800 p-5">
            <Music size={32} className="text-slate-500" />
          </div>
          <p className="text-lg font-medium text-slate-400">No playlists yet</p>
          <p className="mt-1 text-sm text-slate-600">Create a playlist and import your music</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              onClick={() => navigate(`/playlists/${p.id}`)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      <CreatePlaylistModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
