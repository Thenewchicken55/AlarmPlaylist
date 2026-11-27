import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The real engine is replaced, but everything between the store and Howler is
// real: PlaybackProvider owns useTrackPlayback, PlayerPage renders the genuine
// ProgressBar, and this mock only stands in for the final <ReactHowler> call.
const howl = vi.hoisted(() => ({
  seek: vi.fn(),
  duration: vi.fn(() => 3),
  playing: vi.fn(() => true),
}))

const captured = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
  mounts: 0,
}))

vi.mock('react-howler', async () => {
  const React = await import('react')
  return {
    default: React.forwardRef(function MockHowler(props: Record<string, unknown>, ref: React.Ref<unknown>) {
      captured.mounts += 1
      captured.props = props
      React.useImperativeHandle(ref, () => ({ howler: howl }))
      return null
    }),
  }
})

const getAudioSource = vi.hoisted(() => vi.fn())

vi.mock('../db/audioStorage', () => ({ getAudioSource }))

import PlaybackProvider from '../components/player/PlaybackProvider'
import PlayerPage from '../pages/PlayerPage'
import { usePlayerStore } from '../stores/playerStore'
import { makeTrack } from './factories'

const trackA = makeTrack({ id: 'a', title: 'Alpha', duration: 3, blobId: 'blob-a' })
const trackB = makeTrack({ id: 'b', title: 'Beta', duration: 4, blobId: 'blob-b' })

function renderPlayerPage() {
  return render(
    <MemoryRouter initialEntries={['/player']}>
      <PlaybackProvider>
        <PlayerPage />
      </PlaybackProvider>
    </MemoryRouter>,
  )
}

async function start(track = trackA, queue = [trackA]) {
  getAudioSource.mockImplementation(async (id: string) => ({ url: `blob:${id}`, format: 'wav' }))
  usePlayerStore.setState({ currentTrack: track, queue, queueIndex: 0, isPlaying: true })
  renderPlayerPage()
  await waitFor(() => expect(captured.props?.src).toBe(`blob:${track.blobId}`))
  // A real ReactHowler fires onLoad once it knows the duration; the duration
  // lives in the store and the progress bar renders from it.
  act(() => {
    ;(captured.props!.onLoad as () => void)()
  })
  return captured.props!
}

function rect(width: number, left = 0): DOMRect {
  return {
    left,
    width,
    top: 0,
    height: 8,
    right: left + width,
    bottom: 8,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

beforeEach(() => {
  vi.clearAllMocks()
  howl.seek.mockReturnValue(0)
  howl.duration.mockReturnValue(3)
  captured.props = null
  captured.mounts = 0
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

describe('playback chain (provider → engine → progress bar)', () => {
  it('mounts exactly one engine and gives it the stored format', async () => {
    await start()

    expect(captured.mounts).toBe(1)
    expect(captured.props?.src).toBe('blob:blob-a')
    // A blob URL has no extension; without this hint Howler refuses the source.
    expect(captured.props?.format).toEqual(['wav'])
    expect(captured.props?.playing).toBe(true)
    expect(captured.props?.volume).toBe(0.7)
    expect(captured.props?.html5).toBe(true)
  })

  it('advances the progress bar from the engine position', async () => {
    await start()
    howl.duration.mockReturnValue(3)
    howl.seek.mockReturnValue(1.5)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })

    expect(usePlayerStore.getState().progress).toBe(50)
    expect(screen.getByRole('slider', { name: 'Seek' })).toHaveAttribute('aria-valuetext', '0:01 of 0:03')
  })

  it('turns a click on the page progress bar into a real seek', async () => {
    await start()
    const slider = screen.getByRole('slider', { name: 'Seek' })
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(rect(200))

    fireEvent.click(slider, { clientX: 100 })

    // 50% of a 3s track — this is the exact wiring that used to hit the
    // context's no-op seek and leave the handle frozen at 0:00.
    expect(howl.seek).toHaveBeenCalledWith(1.5)
    expect(usePlayerStore.getState().progress).toBe(50)
    expect(slider).toHaveAttribute('aria-valuetext', '0:01 of 0:03')
  })

  it('rewinds the finished sound before advancing to the next track', async () => {
    await start(trackA, [trackA, trackB])

    act(() => {
      ;(captured.props!.onEnd as () => void)()
    })

    expect(howl.seek).toHaveBeenCalledWith(0)
    expect(usePlayerStore.getState().currentTrack?.id).toBe('b')
    await waitFor(() => expect(captured.props?.src).toBe('blob:blob-b'))
  })

  it('plays again after the queue ended instead of immediately re-ending', async () => {
    await start(trackA, [trackA])

    act(() => {
      ;(captured.props!.onEnd as () => void)()
    })
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(usePlayerStore.getState().currentTrack?.id).toBe('a')

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(usePlayerStore.getState().isPlaying).toBe(true)
    await waitFor(() => expect(captured.props?.playing).toBe(true))
  })
})
