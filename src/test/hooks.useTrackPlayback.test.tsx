import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const getAudioSource = vi.hoisted(() => vi.fn())

const yt = vi.hoisted(() => ({
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  unload: vi.fn(),
  duration: vi.fn(() => 0),
  progress: vi.fn(() => 0),
  seek: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  isPlaying: vi.fn(() => false),
}))

vi.mock('../db/audioStorage', () => ({ getAudioSource }))
vi.mock('../services/youtubePlayer', () => ({ youtubePlayer: yt }))

import { useTrackPlayback } from '../components/player/useTrackPlayback'
import { usePlayerStore } from '../stores/playerStore'
import { makeTrack } from './factories'
import type { PlayerEvents } from '../services/playerTypes'

const blobTrack = makeTrack({
  id: 'track-1',
  title: '008 - Most Holy Theotokos save us! [B5kTdd6FUlQ]',
  duration: 120,
  blobId: 'blob-1',
})

function resetStore() {
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isBuffering: false,
    progress: 0,
    duration: 0,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
})

describe('useTrackPlayback (local files)', () => {
  it('resolves a stored file to a URL and its format', async () => {
    getAudioSource.mockResolvedValue({ url: 'blob:stored', format: 'm4a' })

    usePlayerStore.setState({ currentTrack: blobTrack, queue: [blobTrack], queueIndex: 0, isPlaying: true })

    const { result } = renderHook(() => useTrackPlayback())

    await waitFor(() => expect(result.current.url).toBe('blob:stored'))
    expect(getAudioSource).toHaveBeenCalledWith('blob-1')
    expect(result.current.format).toEqual(['m4a'])
  })

  it('infers the format for a plain URL track', async () => {
    const track = makeTrack({ id: 'url-1', url: 'https://example.com/song.mp3', source: 'local' })
    usePlayerStore.setState({ currentTrack: track, queue: [track], queueIndex: 0, isPlaying: true })

    const { result } = renderHook(() => useTrackPlayback())

    await waitFor(() => expect(result.current.url).toBe('https://example.com/song.mp3'))
    expect(getAudioSource).not.toHaveBeenCalled()
    expect(result.current.format).toEqual(['mp3'])
  })

  it('skips a stored file whose audio is gone instead of hanging', async () => {
    getAudioSource.mockResolvedValue(undefined)

    usePlayerStore.setState({ currentTrack: blobTrack, queue: [blobTrack], queueIndex: 0, isPlaying: true })

    const { result } = renderHook(() => useTrackPlayback())

    await waitFor(() => expect(getAudioSource).toHaveBeenCalled())
    expect(result.current.url).toBeUndefined()
  })

  it('stops instead of playing silence when a track has no source at all', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const track = makeTrack({ id: 'broken', title: 'Broken', url: undefined, blobId: undefined })
    usePlayerStore.setState({ currentTrack: track, queue: [track], queueIndex: 0, isPlaying: true })

    renderHook(() => useTrackPlayback())

    await waitFor(() => expect(usePlayerStore.getState().currentTrack).toBeNull())
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('seeks the howl by percentage of its duration', async () => {
    getAudioSource.mockResolvedValue({ url: 'blob:stored', format: 'wav' })
    usePlayerStore.setState({ currentTrack: blobTrack, queue: [blobTrack], queueIndex: 0, isPlaying: true })
    const { result } = renderHook(() => useTrackPlayback())
    await waitFor(() => expect(result.current.url).toBe('blob:stored'))

    const howler = { seek: vi.fn(), duration: vi.fn(() => 10) }
    result.current.howlerRef.current = { howler } as unknown as typeof result.current.howlerRef.current

    act(() => result.current.seek(30))

    expect(howler.seek).toHaveBeenCalledWith(3)
    expect(usePlayerStore.getState().progress).toBe(30)
  })
})

describe('useTrackPlayback (YouTube)', () => {
  const ytTrack = makeTrack({ id: 'yt-1', title: 'Video', source: 'youtube', sourceId: 'vid-1', duration: 0 })

  it('loads the video id and starts playback when the store is playing', async () => {
    let events: PlayerEvents | undefined
    yt.load.mockImplementation((_id: string, handlers: PlayerEvents) => {
      events = handlers
      return Promise.resolve()
    })
    yt.duration.mockReturnValue(42)
    usePlayerStore.setState({ currentTrack: ytTrack, queue: [ytTrack], queueIndex: 0, isPlaying: true })

    const { result } = renderHook(() => useTrackPlayback())

    await waitFor(() => expect(yt.load).toHaveBeenCalledWith('vid-1', expect.any(Object)))
    expect(result.current.isYouTube).toBe(true)

    act(() => events?.onLoad?.())

    expect(yt.play).toHaveBeenCalled()
    expect(usePlayerStore.getState().duration).toBe(42)
  })

  it('mirrors pause and volume changes to the YouTube player', async () => {
    yt.load.mockResolvedValue(undefined)
    usePlayerStore.setState({ currentTrack: ytTrack, queue: [ytTrack], queueIndex: 0, isPlaying: true, volume: 70 })
    renderHook(() => useTrackPlayback())
    await waitFor(() => expect(yt.load).toHaveBeenCalled())

    expect(yt.play).toHaveBeenCalled()
    act(() => usePlayerStore.setState({ isPlaying: false }))
    expect(yt.pause).toHaveBeenCalled()

    act(() => usePlayerStore.setState({ volume: 25 }))
    expect(yt.setVolume).toHaveBeenCalledWith(25)
  })

  it('advances to the next track when the video ends', async () => {
    let events: PlayerEvents | undefined
    yt.load.mockImplementation((_id: string, handlers: PlayerEvents) => {
      events = handlers
      return Promise.resolve()
    })
    const next = makeTrack({ id: 'yt-2', title: 'Next', source: 'youtube', sourceId: 'vid-2' })
    usePlayerStore.setState({ currentTrack: ytTrack, queue: [ytTrack, next], queueIndex: 0, isPlaying: true })
    renderHook(() => useTrackPlayback())
    await waitFor(() => expect(events).toBeDefined())

    act(() => events?.onEnd?.())

    expect(usePlayerStore.getState().currentTrack?.id).toBe('yt-2')
  })

  it('skips a video that cannot load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let events: PlayerEvents | undefined
    yt.load.mockImplementation((_id: string, handlers: PlayerEvents) => {
      events = handlers
      return Promise.resolve()
    })
    usePlayerStore.setState({ currentTrack: ytTrack, queue: [ytTrack], queueIndex: 0, isPlaying: true })
    renderHook(() => useTrackPlayback())
    await waitFor(() => expect(events).toBeDefined())

    act(() => events?.onLoadError?.(new Error('Video not found')))

    await waitFor(() => expect(usePlayerStore.getState().currentTrack).toBeNull())
  })

  it('delegates seeking to the YouTube player', async () => {
    yt.load.mockResolvedValue(undefined)
    usePlayerStore.setState({ currentTrack: ytTrack, queue: [ytTrack], queueIndex: 0, isPlaying: true })
    const { result } = renderHook(() => useTrackPlayback())
    await waitFor(() => expect(yt.load).toHaveBeenCalled())

    act(() => result.current.seek(40))

    expect(yt.seek).toHaveBeenCalledWith(40)
    expect(usePlayerStore.getState().progress).toBe(40)
  })
})

describe('useTrackPlayback progress polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps polling after a tick where Howler is not ready yet', async () => {
    getAudioSource.mockResolvedValue({ url: 'blob:stored', format: 'wav' })
    const howler = { seek: vi.fn(() => 1), duration: vi.fn(() => 4) }
    usePlayerStore.setState({
      currentTrack: blobTrack,
      queue: [blobTrack],
      queueIndex: 0,
      isPlaying: true,
      progress: 0,
    })

    const { result } = renderHook(() => useTrackPlayback())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.url).toBe('blob:stored')

    // A tick with no Howler instance must not kill the loop (the old
    // requestAnimationFrame implementation returned without rescheduling).
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(usePlayerStore.getState().progress).toBe(0)

    result.current.howlerRef.current = { howler } as unknown as typeof result.current.howlerRef.current

    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(usePlayerStore.getState().progress).toBe(25)

    howler.seek.mockReturnValue(2)
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(usePlayerStore.getState().progress).toBe(50)
  })

  it('skips a stalled track after the watchdog window', async () => {
    getAudioSource.mockResolvedValue({ url: 'blob:stored', format: 'wav' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const howler = { seek: vi.fn(() => 0), duration: vi.fn(() => 0) }
    usePlayerStore.setState({
      currentTrack: blobTrack,
      queue: [blobTrack],
      queueIndex: 0,
      isPlaying: true,
      progress: 0,
    })

    const { result } = renderHook(() => useTrackPlayback())
    await act(async () => {
      await Promise.resolve()
    })
    result.current.howlerRef.current = { howler } as unknown as typeof result.current.howlerRef.current

    // No progress ever appears; after 30s of silence the watchdog gives up.
    await act(async () => {
      vi.advanceTimersByTime(36_000)
    })

    expect(usePlayerStore.getState().currentTrack).toBeNull()
  })
})
