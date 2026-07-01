import { create } from 'zustand'
import type { Track } from '../types'

interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  volume: number
  progress: number
  duration: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'

  playTrack: (track: Track, queue?: Track[], index?: number) => void
  playQueue: (tracks: Track[], startIndex?: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setVolume: (vol: number) => void
  setProgress: (prog: number) => void
  setDuration: (dur: number) => void
  next: () => void
  prev: () => void
  toggleShuffle: () => void
  setRepeat: (mode: 'none' | 'one' | 'all') => void
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 70,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',

  playTrack: (track, queue, index) => {
    set({
      currentTrack: track,
      queue: queue ?? [track],
      queueIndex: index ?? 0,
      isPlaying: true,
      progress: 0,
    })
  },

  playQueue: (tracks, startIndex = 0) => {
    const track = tracks[startIndex]
    if (!track) return
    set({
      currentTrack: track,
      queue: tracks,
      queueIndex: startIndex,
      isPlaying: true,
      progress: 0,
    })
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false, currentTrack: null, progress: 0 }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(100, vol)) }),
  setProgress: (prog) => set({ progress: prog }),
  setDuration: (dur) => set({ duration: dur }),

  next: () => {
    const { queue, queueIndex, repeat, shuffle } = get()
    if (queue.length === 0) return

    if (repeat === 'one') {
      return
    }

    if (shuffle) {
      const remaining = queue.filter((_, i) => i !== queueIndex)
      if (remaining.length === 0) {
        if (repeat === 'all') {
          const shuffled = shuffleArray(queue)
          set({ currentTrack: shuffled[0], queue: shuffled, queueIndex: 0 })
        } else {
          set({ isPlaying: false })
        }
        return
      }
      const nextIndex = Math.floor(Math.random() * remaining.length)
      const actualIndex = queue.indexOf(remaining[nextIndex])
      set({
        currentTrack: queue[actualIndex],
        queueIndex: actualIndex,
        isPlaying: true,
        progress: 0,
      })
      return
    }

    const nextIndex = queueIndex + 1
    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        set({
          currentTrack: queue[0],
          queueIndex: 0,
          isPlaying: true,
          progress: 0,
        })
      } else {
        set({ isPlaying: false })
      }
      return
    }

    set({
      currentTrack: queue[nextIndex],
      queueIndex: nextIndex,
      isPlaying: true,
      progress: 0,
    })
  },

  prev: () => {
    const { queue, queueIndex, progress } = get()
    if (queue.length === 0) return

    if (progress > 5) {
      set({ progress: 0 })
      return
    }

    const prevIndex = queueIndex - 1
    if (prevIndex < 0) return

    set({
      currentTrack: queue[prevIndex],
      queueIndex: prevIndex,
      isPlaying: true,
      progress: 0,
    })
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  setRepeat: (mode) => set({ repeat: mode }),
}))
