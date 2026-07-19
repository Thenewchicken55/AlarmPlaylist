import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'

interface PlaybackControlsProps {
  size?: 'default' | 'large'
}

export default function PlaybackControls({ size = 'default' }: PlaybackControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const pause = usePlayerStore((s) => s.pause)
  const resume = usePlayerStore((s) => s.resume)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const setRepeat = usePlayerStore((s) => s.setRepeat)

  const btnSize = size === 'large' ? 'h-14 w-14' : 'h-10 w-10'
  const iconSize = size === 'large' ? 28 : 20
  const smIconSize = size === 'large' ? 22 : 16

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <button
        onClick={toggleShuffle}
        aria-pressed={shuffle}
        aria-label="Shuffle"
        className={`rounded-lg p-2 transition-colors ${
          shuffle ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Shuffle size={smIconSize} />
      </button>

      <button
        onClick={prev}
        aria-label="Previous track"
        className="rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-200"
      >
        <SkipBack size={iconSize} />
      </button>

      <button
        onClick={isPlaying ? pause : resume}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={`${btnSize} flex items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition-transform hover:scale-105 active:scale-95`}
      >
        {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} style={{ marginLeft: 2 }} />}
      </button>

      <button
        onClick={next}
        aria-label="Next track"
        className="rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-200"
      >
        <SkipForward size={iconSize} />
      </button>

      <button
        onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
        aria-pressed={repeat !== 'none'}
        aria-label={`Repeat: ${repeat === 'none' ? 'off' : repeat === 'all' ? 'all' : 'one'}`}
        className={`rounded-lg p-2 transition-colors ${
          repeat !== 'none' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        {repeat === 'one' ? (
          <span className="relative">
            <Repeat size={smIconSize} />
            <span className="absolute -right-0.5 -top-0.5 text-[8px] font-bold">1</span>
          </span>
        ) : (
          <Repeat size={smIconSize} />
        )}
      </button>
    </div>
  )
}
