import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { usePlaylistStore } from '../../stores/playlistStore'
import { useUIStore } from '../../stores/uiStore'
import { isYouTubeConnected, initYouTubeClient, authenticateYouTube, fetchYouTubePlaylists, fetchYouTubePlaylistTracks } from '../../services/youtube'
import { isSpotifyConnected, authenticateSpotify, fetchSpotifyPlaylists, fetchSpotifyPlaylistTracks } from '../../services/spotify'
import type { PlaylistSource, Playlist as PlaylistType } from '../../types'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
}

const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

export default function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const [source, setSource] = useState<PlaylistSource>('local')
  const [color, setColor] = useState(colors[0])
  const [loading, setLoading] = useState(false)
  const [youtubeConnected, setYoutubeConnected] = useState(isYouTubeConnected())
  const [spotifyConnected] = useState(isSpotifyConnected())
  const [remotePlaylists, setRemotePlaylists] = useState<PlaylistType[]>([])
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null)

  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const addTrack = usePlaylistStore((s) => s.addTrack)
  const showToast = useUIStore((s) => s.showToast)

  useEffect(() => {
    if (!open) {
      setSource('local')
      setSelectedRemoteId(null)
      setRemotePlaylists([])
    }
  }, [open])

  async function handleYouTubeConnect() {
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
    if (!clientId) {
      showToast('YouTube Client ID not configured. Set VITE_YOUTUBE_CLIENT_ID in .env', 'error')
      return
    }
    try {
      await initYouTubeClient(clientId)
      await authenticateYouTube()
      setYoutubeConnected(isYouTubeConnected())
      if (isYouTubeConnected()) {
        showToast('YouTube connected!', 'success')
      }
    } catch {
      showToast('YouTube authentication failed', 'error')
    }
  }

  function handleSpotifyConnect() {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    if (!clientId) {
      showToast('Spotify Client ID not configured. Set VITE_SPOTIFY_CLIENT_ID in .env', 'error')
      return
    }
    authenticateSpotify(clientId, window.location.origin + '/spotify-callback')
  }

  async function handleFetchRemote() {
    setLoading(true)
    try {
      let playlists: PlaylistType[] = []
      if (source === 'youtube') playlists = await fetchYouTubePlaylists()
      else if (source === 'spotify') playlists = await fetchSpotifyPlaylists()
      setRemotePlaylists(playlists)
      if (playlists.length === 0) showToast('No playlists found', 'info')
    } catch {
      showToast('Failed to fetch playlists', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleImportRemote() {
    if (!selectedRemoteId || source === 'local') return
    setLoading(true)
    try {
      const remotePlaylist = remotePlaylists.find((p) => p.id === selectedRemoteId)
      if (!remotePlaylist) return

      const tracks = source === 'youtube'
        ? await fetchYouTubePlaylistTracks(selectedRemoteId)
        : await fetchSpotifyPlaylistTracks(selectedRemoteId)

      const playlist = await createPlaylist({
        name: remotePlaylist.name,
        source,
        color,
        sourceUrl: `https://www.youtube.com/playlist?list=${selectedRemoteId}`,
      })

      for (const track of tracks) {
        await addTrack(playlist.id, track)
      }

      showToast(`Imported "${remotePlaylist.name}" (${tracks.length} tracks)`, 'success')
      onClose()
    } catch {
      showToast('Failed to import playlist', 'error')
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
      showToast('Playlist created', 'success')
      onClose()
    } catch {
      showToast('Failed to create playlist', 'error')
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
            {(['local', 'youtube', 'spotify'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSource(s); setSelectedRemoteId(null); setRemotePlaylists([]) }}
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
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={loading}>Create</Button>
            </div>
          </form>
        )}

        {showRemoteConfig && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              {source === 'youtube'
                ? 'Import a YouTube playlist. Note: playback will use YouTube thumbnails as references.'
                : 'Import a Spotify playlist. Note: only 30-second preview clips are available for playback.'}
            </p>

            {source === 'youtube' && !youtubeConnected && (
              <Button onClick={handleYouTubeConnect} className="w-full">
                Connect YouTube
              </Button>
            )}
            {source === 'spotify' && !spotifyConnected && (
              <Button onClick={handleSpotifyConnect} className="w-full">
                Connect Spotify
              </Button>
            )}

            {(source === 'youtube' && youtubeConnected) || (source === 'spotify' && spotifyConnected) ? (
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
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
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
