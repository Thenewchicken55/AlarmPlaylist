import { useRef } from 'react'
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
  onImportFiles: (files: FileList) => void
}

export default function TrackList({ tracks, currentTrackId, onPlay, onRemove, onImportFiles }: TrackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} />
          Add Files
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
      <div className="space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            isPlaying={track.id === currentTrackId}
            onPlay={() => onPlay(track, i)}
            onRemove={() => onRemove(track.id)}
          />
        ))}
      </div>
    </div>
  )
}
