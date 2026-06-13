import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { usePlaylistStore } from '../../stores/playlistStore'
import { useUIStore } from '../../stores/uiStore'
import type { PlaylistSource } from '../../types'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
}

const sources: { value: PlaylistSource; label: string }[] = [
  { value: 'local', label: 'Local Files' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
]

const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

export default function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const [source, setSource] = useState<PlaylistSource>('local')
  const [color, setColor] = useState(colors[0])
  const [loading, setLoading] = useState(false)

  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const showToast = useUIStore((s) => s.showToast)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createPlaylist({ name: name.trim(), source, color })
      showToast('Playlist created', 'success')
      onClose()
      setName('')
      setColor(colors[0])
    } catch {
      showToast('Failed to create playlist', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Playlist"
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Source</label>
          <div className="flex gap-2">
            {sources.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                disabled={s.value !== 'local'}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  source === s.value
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                } ${s.value !== 'local' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                title={s.value !== 'local' ? 'Coming soon' : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

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
          <Button type="submit" disabled={!name.trim() || loading}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
