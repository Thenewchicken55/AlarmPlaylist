import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'

const howl = vi.hoisted(() => ({ seek: vi.fn(), duration: vi.fn(() => 215) }))
const captured = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))

vi.mock('react-howler', () => ({
  default: (props: Record<string, unknown>) => {
    captured.props = props
    return null
  },
}))

import AudioPlayer from '../components/player/AudioPlayer'
import type { Playback } from '../components/player/useTrackPlayback'
import { usePlayerStore } from '../stores/playerStore'
import type { Track } from '../types'

const track: Track = {
  id: 'track-1',
  title: 'Test tone',
  artist: 'Unknown Artist',
  duration: 215,
  source: 'local',
  blobId: 'blob-1',
}

function makePlayback(overrides: Partial<Playback> = {}): Playback {
  return {
    url: 'blob:stored',
    format: ['wav'],
    howlerRef: { current: { howler: howl } } as unknown as Playback['howlerRef'],
    isYouTube: false,
    seek: vi.fn(),
    skip: vi.fn(),
    ...overrides,
  }
}

function renderPlayer(playback: Playback = makePlayback()) {
  render(<AudioPlayer playback={playback} />)
  const props = captured.props
  if (!props) throw new Error('ReactHowler was not rendered')
  return props
}

beforeEach(() => {
  vi.clearAllMocks()
  usePlayerStore.setState({
    currentTrack: track,
    queue: [track],
    queueIndex: 0,
    isPlaying: true,
    volume: 70,
    progress: 0,
    duration: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AudioPlayer', () => {
  it('mounts Howler with the resolved source and its format hint', () => {
    const props = renderPlayer()

    expect(props.src).toBe('blob:stored')
    // The format is what makes a blob: URL playable at all — never drop it.
    expect(props.format).toEqual(['wav'])
    expect(props.playing).toBe(true)
    expect(props.volume).toBe(0.7)
  })

  it('rewinds a finished sound before advancing the queue', () => {
    const next = vi.fn()
    usePlayerStore.setState({ next })

    const props = renderPlayer()
    act(() => {
      ;(props.onEnd as () => void)()
    })

    expect(howl.seek).toHaveBeenCalledWith(0)
    expect(next).toHaveBeenCalledTimes(1)
    // Howler ends a howl whose seek is still at the duration, so the rewind
    // has to happen first or replaying the track re-fires `end` immediately.
    expect(howl.seek.mock.invocationCallOrder[0]).toBeLessThan(next.mock.invocationCallOrder[0])
  })

  it('takes the duration from Howler once the sound has loaded', () => {
    const props = renderPlayer()
    act(() => {
      ;(props.onLoad as () => void)()
    })

    expect(usePlayerStore.getState().duration).toBe(215)
  })

  it('skips the track when Howler cannot load it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const skip = vi.fn()
    const props = renderPlayer(makePlayback({ skip }))

    act(() => {
      ;(props.onLoadError as (id: number, err: unknown) => void)(1, new Error('decode failed'))
    })

    expect(skip).toHaveBeenCalledWith('Test tone', 'failed to load audio')
  })

  it('does not skip when the failing track is no longer current', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const skip = vi.fn()
    const props = renderPlayer(makePlayback({ skip }))
    usePlayerStore.setState({ currentTrack: { ...track, id: 'track-2' } })

    act(() => {
      ;(props.onLoadError as (id: number, err: unknown) => void)(1, new Error('decode failed'))
    })

    expect(skip).not.toHaveBeenCalled()
  })
})
