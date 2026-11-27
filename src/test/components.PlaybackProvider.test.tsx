import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const seek = vi.hoisted(() => vi.fn())

vi.mock('../components/player/useTrackPlayback', () => ({
  useTrackPlayback: () => ({
    url: undefined,
    format: undefined,
    howlerRef: { current: null },
    isYouTube: false,
    seek,
    skip: vi.fn(),
  }),
}))

vi.mock('../components/player/AudioPlayer', () => ({
  default: () => null,
}))

import PlaybackProvider from '../components/player/PlaybackProvider'
import { useAudioSeek } from '../components/player/AudioPlayerContext'

function SeekProbe() {
  const seekFromContext = useAudioSeek()
  return (
    <button type="button" onClick={() => seekFromContext(42)}>
      seek
    </button>
  )
}

describe('PlaybackProvider', () => {
  it('publishes the playback seek to everything rendered below it', () => {
    render(
      <PlaybackProvider>
        <SeekProbe />
      </PlaybackProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'seek' }))

    // A provider mounted inside AudioPlayer would leave pages with the no-op
    // default seek from AudioPlayerContext.
    expect(seek).toHaveBeenCalledWith(42)
  })
})
