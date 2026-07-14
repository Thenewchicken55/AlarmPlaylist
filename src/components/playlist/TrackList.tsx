import { useRef } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

function SortableTrackRow({
  track,
  isPlaying,
  onPlay,
  onRemove,
}: {
  track: Track
  isPlaying: boolean
  onPlay: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={`rounded-lg ${isDragging ? 'opacity-50' : ''}`}>
      <TrackRow
        track={track}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export default function TrackList({
  tracks,
  currentTrackId,
  onPlay,
  onRemove,
  onReorder,
  onImportFiles,
}: TrackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tracks.findIndex((t) => t.id === active.id)
    const newIndex = tracks.findIndex((t) => t.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex)
    }
  }

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {tracks.map((track) => (
              <SortableTrackRow
                key={track.id}
                track={track}
                isPlaying={track.id === currentTrackId}
                onPlay={() => onPlay(track, tracks.indexOf(track))}
                onRemove={() => onRemove(track.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
