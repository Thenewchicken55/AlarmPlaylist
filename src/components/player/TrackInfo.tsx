import { memo } from 'react'
import type { Track } from '../../types'
import { truncate } from '../../utils/format'

interface TrackInfoProps {
  track: Track | null
  compact?: boolean
}

function TrackInfoComponent({ track, compact }: TrackInfoProps) {
  if (!track) {
    return (
      <div className="text-center">
        <p className="text-base font-medium text-slate-500">No track selected</p>
        <p className="mt-1 text-sm text-slate-600">Choose a song from your playlists</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{track.title}</p>
        <p className="truncate text-xs text-slate-500">{track.artist}</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="text-xl font-semibold text-slate-100">{truncate(track.title, 40)}</p>
      <p className="mt-1 text-sm text-slate-400">{track.artist}</p>
    </div>
  )
}

const TrackInfo = memo(TrackInfoComponent)
export default TrackInfo
