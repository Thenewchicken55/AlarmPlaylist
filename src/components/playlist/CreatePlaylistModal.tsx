import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { toast } from 'sonner'
import { usePlaylistStore } from '../../stores/playlistStore'
import { parseYouTubePlaylistUrl, fetchYouTubePlaylist } from '../../services/youtube'
import type { PlaylistSource, Track } from '../../types'

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
  const [name, setName] = useState('')
  const [color, setColor] = useState(colors[0])
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [fetchedTracks, setFetchedTracks] = useState<Track[]>([])
  const [playlistTitle, setPlaylistTitle] = useState('')

  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const addTrack = usePlaylistStore((s) => s.addTrack)

  async function handleFetch() {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
      toast.error('YouTube API Key not configured. Set VITE_YOUTUBE_API_KEY in .env')
      return
    }

    const playlistId = parseYouTubePlaylistUrl(url.trim())
    if (!playlistId) {
      toast.error('Invalid YouTube playlist URL')
      return
    }

    setLoading(true)
    try {
      const result = await fetchYouTubePlaylist(playlistId, apiKey)
      setFetchedTracks(result.tracks)
      setPlaylistTitle(result.title)
      setName(result.title)
      toast.success(`Found ${result.tracks.length} tracks`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch playlist')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (fetchedTracks.length === 0) return
    setLoading(true)
    try {
      const playlist = await createPlaylist({
        name: name.trim() || playlistTitle || 'YouTube Playlist',
        source: 'youtube',
        sourceUrl: url.trim(),
        color,
      })

      for (const track of fetchedTracks) {
        await addTrack(playlist.id, track)
      }

      toast.success(`Imported "${playlist.name}" (${fetchedTracks.length} tracks)`)
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
      await createPlaylist({ name: name.trim(), source, color })
      toast.success('Playlist created')
      onClose()
    } catch {
      toast.error('Failed to create playlist')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setUrl('')
    setFetchedTracks([])
    setPlaylistTitle('')
    setName('')
    setColor(colors[0])
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
                  reset()
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
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Playlist"
              autoFocus
            />

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
              Paste a YouTube playlist URL to import its tracks. Tracks will play through the embedded YouTube player.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/playlist?list=..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500"
              />
              <Button onClick={handleFetch} loading={loading} disabled={!url.trim()}>
                Fetch
              </Button>
            </div>

            {fetchedTracks.length > 0 && (
              <div className="space-y-3">
                <Input
                  label="Playlist Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Playlist"
                />

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

                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50">
                  {fetchedTracks.slice(0, 50).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 border-b border-slate-700/50 px-3 py-2 text-sm last:border-0"
                    >
                      {track.thumbnail && (
                        <img src={track.thumbnail} alt="" className="h-8 w-12 flex-shrink-0 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate text-slate-200">{track.title}</div>
                        <div className="truncate text-xs text-slate-500">{track.artist}</div>
                      </div>
                    </div>
                  ))}
                  {fetchedTracks.length > 50 && (
                    <div className="px-3 py-2 text-xs text-slate-500">+{fetchedTracks.length - 50} more tracks</div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} loading={loading}>
                    Import ({fetchedTracks.length})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
