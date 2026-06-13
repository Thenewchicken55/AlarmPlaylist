import { useRef, useState } from 'react'
import TrackRow from './TrackRow'
import Button from '../ui/Button'
import { Upload } from 'lucide-react'
import type { Track } from '../../types'

interface TrackListProps {
  tracks: Track[]
  playlistId: string
  currentTrackId?: string | null
  onPlay: (track: Track, index: number) => void
  onRemove: (trackId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onImportFiles: (files: FileList) => void
}

export default function TrackList({ tracks, currentTrackId, onPlay, onRemove, onReorder, onImportFiles }: TrackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-full bg-slate-800 p-4">
          <Upload size={28} className="text-slate-500" />
        </div>
        <div>
          <p className="text-base font-medium text-slate-400">No tracks yet</p>
          <p className="mt-1 text-sm text-slate-600">Import audio files to get started</p>
        </div>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
          Import Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onImportFiles(e.target.files)}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">{tracks.length} tracks</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Add Files
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onImportFiles(e.target.files)}
        />
      </div>
      <div className="space-y-0.5">
        {tracks.map((track, i) => (
          <div
            key={track.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i) }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) {
                onReorder(dragIndex, i)
              }
              setDragIndex(null)
              setDragOverIndex(null)
            }}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
            className={`rounded-lg transition-colors ${dragOverIndex === i ? 'ring-2 ring-indigo-500' : ''} ${dragIndex === i ? 'opacity-50' : ''}`}
          >
            <TrackRow
              track={track}
              isPlaying={track.id === currentTrackId}
              onPlay={() => onPlay(track, i)}
              onRemove={() => onRemove(track.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
