import { usePlayerStore } from '../../stores/playerStore'

/**
 * Just the progress sliver at the bottom of the MiniPlayer.
 *
 * Isolated into its own component so that the 4×/sec `setProgress` ticks only
 * re-render this small element, not the whole MiniPlayer (album art, track
 * info, play button).
 */
export default function MiniProgress() {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)

  return (
    <div className="h-0.5 bg-slate-800">
      <div className="h-full bg-indigo-500" style={{ width: `${duration > 0 ? Math.min(100, progress) : 0}%` }} />
    </div>
  )
}
