import { useRef, useCallback } from 'react'
import { formatDuration } from '../../utils/time'
import { useAudioSeek } from './AudioPlayerContext'

interface ProgressBarProps {
  progress: number
  duration: number
}

export default function ProgressBar({ progress, duration }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const seek = useAudioSeek()

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bar = barRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      seek(percent)
    },
    [seek],
  )

  const handleSeek = useCallback((e: React.MouseEvent) => seekFromClientX(e.clientX), [seekFromClientX])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) seekFromClientX(e.touches[0].clientX)
    },
    [seekFromClientX],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches[0]) seekFromClientX(e.changedTouches[0].clientX)
    },
    [seekFromClientX],
  )

  // Keyboard seeking for the progress bar (treated as a slider). Left/Right
  // arrows seek by 5s, Home/End jump to start/end.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (duration <= 0) return
      const currentSeconds = (progress / 100) * duration
      const step = 5
      let nextSeconds: number
      switch (e.key) {
        case 'ArrowLeft':
          nextSeconds = Math.max(0, currentSeconds - step)
          break
        case 'ArrowRight':
          nextSeconds = Math.min(duration, currentSeconds + step)
          break
        case 'Home':
          nextSeconds = 0
          break
        case 'End':
          nextSeconds = duration
          break
        default:
          return
      }
      e.preventDefault()
      seek((nextSeconds / duration) * 100)
    },
    [duration, progress, seek],
  )

  const clamped = Math.min(100, progress)

  return (
    <div className="w-full">
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.round((progress / 100) * duration)}
        aria-valuetext={`${formatDuration((progress / 100) * duration)} of ${formatDuration(duration)}`}
        className="relative h-2 cursor-pointer rounded-full bg-slate-700"
        onClick={handleSeek}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-100"
          style={{ left: `calc(${clamped}% - 8px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{formatDuration((progress / 100) * duration)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}
