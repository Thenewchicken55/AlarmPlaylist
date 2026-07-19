import { Volume2, Volume1, VolumeX } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'

export default function VolumeSlider() {
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)

  function toggleMute() {
    setVolume(volume > 0 ? 0 : 70)
  }

  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
        aria-pressed={volume === 0}
        className="text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Icon size={18} />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        aria-label="Volume"
        onChange={(e) => setVolume(parseInt(e.target.value))}
        className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
    </div>
  )
}
