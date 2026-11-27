import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { usePlayerStore } from '../stores/playerStore'
import { makeTrack } from './factories'

const a = makeTrack({ id: 'a', title: 'A' })
const b = makeTrack({ id: 'b', title: 'B' })
const c = makeTrack({ id: 'c', title: 'C' })

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isBuffering: false,
    volume: 70,
    progress: 0,
    duration: 0,
    shuffle: false,
    repeat: 'none',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('queue and playback state', () => {
  it('playQueue starts at the requested index and resets progress', () => {
    usePlayerStore.setState({ progress: 40 })
    usePlayerStore.getState().playQueue([a, b, c], 1)

    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: b,
      queueIndex: 1,
      isPlaying: true,
      progress: 0,
    })
  })

  it('playQueue ignores an out-of-range start index', () => {
    usePlayerStore.getState().playQueue([], 0)
    expect(usePlayerStore.getState().currentTrack).toBeNull()
  })

  it('playTrack uses the track itself as the queue when none is given', () => {
    usePlayerStore.getState().playTrack(b)

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: b, queue: [b], queueIndex: 0, isPlaying: true })
  })

  it('stop clears the track, progress and playing flag', () => {
    usePlayerStore.setState({ currentTrack: a, isPlaying: true, progress: 30 })
    usePlayerStore.getState().stop()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: null, isPlaying: false, progress: 0 })
  })
})

describe('next', () => {
  beforeEach(() => {
    usePlayerStore.setState({ queue: [a, b, c], queueIndex: 0, currentTrack: a, isPlaying: true })
  })

  it('advances one track and resets progress', () => {
    usePlayerStore.setState({ progress: 80 })
    usePlayerStore.getState().next()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: b, queueIndex: 1, isPlaying: true, progress: 0 })
  })

  it('keeps the last track but pauses at the end with repeat off', () => {
    usePlayerStore.setState({ queueIndex: 2, currentTrack: c })
    usePlayerStore.getState().next()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: c, queueIndex: 2, isPlaying: false })
  })

  it('wraps to the first track with repeat all', () => {
    usePlayerStore.setState({ queueIndex: 2, currentTrack: c, repeat: 'all' })
    usePlayerStore.getState().next()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, queueIndex: 0, isPlaying: true, progress: 0 })
  })

  it('does nothing with repeat one', () => {
    usePlayerStore.setState({ repeat: 'one' })
    usePlayerStore.getState().next()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, queueIndex: 0, isPlaying: true })
  })

  it('picks a different track in shuffle mode', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    usePlayerStore.setState({ shuffle: true })
    usePlayerStore.getState().next()

    expect(usePlayerStore.getState().currentTrack?.id).not.toBe('a')
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('pauses a single-track shuffle queue at the end unless repeat is all', () => {
    usePlayerStore.setState({ queue: [a], currentTrack: a, queueIndex: 0, shuffle: true })
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, isPlaying: false })

    usePlayerStore.setState({ shuffle: true, repeat: 'all', isPlaying: true })
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, isPlaying: true })
  })
})

describe('prev', () => {
  it('restarts the current track when more than 5% has played', () => {
    usePlayerStore.setState({ queue: [a, b], queueIndex: 1, currentTrack: b, progress: 40 })
    usePlayerStore.getState().prev()

    // The UI restarts the track; the engine reads the same progress reset.
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: b, queueIndex: 1, progress: 0 })
  })

  it('goes back one track when progress is low', () => {
    usePlayerStore.setState({ queue: [a, b], queueIndex: 1, currentTrack: b, progress: 2 })
    usePlayerStore.getState().prev()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, queueIndex: 0, progress: 0, isPlaying: true })
  })

  it('stays put on the first track', () => {
    usePlayerStore.setState({ queue: [a, b], queueIndex: 0, currentTrack: a, progress: 0, isPlaying: true })
    usePlayerStore.getState().prev()

    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, queueIndex: 0, isPlaying: true })
  })
})

describe('settings', () => {
  it('clamps the volume to 0–100', () => {
    usePlayerStore.getState().setVolume(150)
    expect(usePlayerStore.getState().volume).toBe(100)
    usePlayerStore.getState().setVolume(-20)
    expect(usePlayerStore.getState().volume).toBe(0)
    usePlayerStore.getState().setVolume(55)
    expect(usePlayerStore.getState().volume).toBe(55)
  })

  it('toggles pause and resume without touching the track', () => {
    usePlayerStore.setState({ currentTrack: a, isPlaying: true })
    usePlayerStore.getState().pause()
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, isPlaying: false })
    usePlayerStore.getState().resume()
    expect(usePlayerStore.getState()).toMatchObject({ currentTrack: a, isPlaying: true })
  })

  it('cycles shuffle and repeat modes', () => {
    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().shuffle).toBe(true)
    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().shuffle).toBe(false)

    usePlayerStore.getState().setRepeat('all')
    expect(usePlayerStore.getState().repeat).toBe('all')
    usePlayerStore.getState().setRepeat('one')
    expect(usePlayerStore.getState().repeat).toBe('one')
  })
})
