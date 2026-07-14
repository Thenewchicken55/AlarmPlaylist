import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { toast } from 'sonner'
import { usePlaylistStore } from '../../stores/playlistStore'
import {
  isYouTubeConnected,
  initYouTubeClient,
  authenticateYouTube,
  fetchYouTubePlaylists,
  fetchYouTubePlaylistTracks,
} from '../../services/youtube'
import type { PlaylistSource, Playlist as PlaylistType } from '../../types'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
}

const colors = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
]

export default function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const [source, setSource] = useState<PlaylistSource>('local')
  const [color, setColor] = useState(colors[0])
  const [loading, setLoading] = useState(false)
  const [youtubeConnected, setYoutubeConnected] = useState(isYouTubeConnected())
  const [remotePlaylists, setRemotePlaylists] = useState<PlaylistType[]>([])
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null)

  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const addTrack = usePlaylistStore((s) => s.addTrack)

  async function handleYouTubeConnect() {
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
    if (!clientId) {
      toast.error('YouTube Client ID not configured. Set VITE_YOUTUBE_CLIENT_ID in .env')
      return
    }
    try {
      await initYouTubeClient(clientId)
      await authenticateYouTube()
      setYoutubeConnected(isYouTubeConnected())
      if (isYouTubeConnected()) {
        toast.success('YouTube connected!')
      }
    } catch {
      toast.error('YouTube authentication failed')
    }
  }

  async function handleFetchRemote() {
    setLoading(true)
    try {
      const playlists = await fetchYouTubePlaylists()
      setRemotePlaylists(playlists)
      if (playlists.length === 0) toast.info('No playlists found')
    } catch {
      toast.error('Failed to fetch playlists')
    } finally {
      setLoading(false)
    }
  }

  async function handleImportRemote() {
    if (!selectedRemoteId) return
    setLoading(true)
    try {
      const remotePlaylist = remotePlaylists.find((p) => p.id === selectedRemoteId)
      if (!remotePlaylist) return

      const tracks = await fetchYouTubePlaylistTracks(selectedRemoteId)

      const playlist = await createPlaylist({
        name: remotePlaylist.name,
        source,
        color,
        sourceUrl: `https://www.youtube.com/playlist?list=${selectedRemoteId}`,
      })

      for (const track of tracks) {
        await addTrack(playlist.id, track)
      }

      toast.success(`Imported "${remotePlaylist.name}" (${tracks.length} tracks)`)
      onClose()
    } catch {
      toast.error('Failed to import playlist')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (source !== 'local') return

    setLoading(true)
    try {
      const nameInput = (e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement
      await createPlaylist({ name: nameInput.value.trim(), source, color })
      toast.success('Playlist created')
      onClose()
    } catch {
      toast.error('Failed to create playlist')
    } finally {
      setLoading(false)
    }
  }

  const showRemoteConfig = source !== 'local'

  return (
    <Modal open={open} onClose={onClose} title="New Playlist">
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Source</label>
          <div className="flex gap-2">
            {(['local', 'youtube'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSource(s)
                  setSelectedRemoteId(null)
                  setRemotePlaylists([])
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  source === s
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {s === 'local' ? 'Local Files' : s}
              </button>
            ))}
          </div>
        </div>

        {!showRemoteConfig && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" name="name" placeholder="My Playlist" autoFocus />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Color</label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create
              </Button>
            </div>
          </form>
        )}

        {showRemoteConfig && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Import a YouTube playlist. Note: playback will use YouTube thumbnails as references.
            </p>

            {!youtubeConnected && (
              <Button onClick={handleYouTubeConnect} className="w-full">
                Connect YouTube
              </Button>
            )}

            {youtubeConnected && (
              <>
                {remotePlaylists.length === 0 ? (
                  <Button onClick={handleFetchRemote} loading={loading} className="w-full">
                    Load Playlists
                  </Button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-300">Select playlist</label>
                    <select
                      value={selectedRemoteId ?? ''}
                      onChange={(e) => setSelectedRemoteId(e.target.value || null)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose a playlist...</option>
                      {remotePlaylists.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              {selectedRemoteId && (
                <Button onClick={handleImportRemote} loading={loading}>
                  Import
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
