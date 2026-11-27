import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TrackList from '../components/playlist/TrackList'
import { makeTrack } from './factories'

const tracks = [
  makeTrack({ id: 'a', title: 'Alpha', artist: 'Artist A', duration: 125 }),
  makeTrack({ id: 'b', title: 'Beta', artist: 'Artist B', duration: 65 }),
]

function renderList(overrides: Partial<Parameters<typeof TrackList>[0]> = {}) {
  const props = {
    tracks,
    playlistId: 'p1',
    currentTrackId: null,
    isPlaying: false,
    onPlay: vi.fn(),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
    onImportFiles: vi.fn(),
    ...overrides,
  }
  return { ...render(<TrackList {...props} />), props }
}

describe('TrackList', () => {
  it('shows the empty state with an import affordance', () => {
    renderList({ tracks: [] })

    expect(screen.getByText('No tracks yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Import Files/i })).toBeInTheDocument()
  })

  it('renders each track with its duration and count', () => {
    renderList()

    expect(screen.getByText('2 tracks')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('2:05')).toBeInTheDocument()
    expect(screen.getByText('1:05')).toBeInTheDocument()
  })

  it('plays the row that was clicked, with its queue index', () => {
    const { props } = renderList()

    fireEvent.click(screen.getByRole('button', { name: 'Play Beta' }))

    expect(props.onPlay).toHaveBeenCalledWith(tracks[1], 1)
  })

  it('shows a pause affordance for the playing track', () => {
    renderList({ currentTrackId: 'a', isPlaying: true })

    expect(screen.getByRole('button', { name: 'Pause Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Beta' })).toBeInTheDocument()
  })

  it('removes the track whose remove button was clicked', () => {
    const { props } = renderList()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alpha from playlist' }))

    expect(props.onRemove).toHaveBeenCalledWith('a')
  })

  it('hands selected files to the import callback', () => {
    const { props, container } = renderList()
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['x'], 'song.mp3', { type: 'audio/mpeg' })
    Object.defineProperty(input, 'files', { value: [file] })

    fireEvent.change(input)

    expect(props.onImportFiles).toHaveBeenCalledWith([file])
  })
})
