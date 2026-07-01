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

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const bar = barRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    seek(percent)
  }, [seek])

  return (
    <div className="w-full">
      <div
        ref={barRef}
        className="relative h-2 cursor-pointer rounded-full bg-slate-700"
        onClick={handleSeek}
        onTouchMove={handleSeek}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-100"
          style={{ left: `calc(${Math.min(100, progress)}% - 8px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{formatDuration((progress / 100) * duration)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}
