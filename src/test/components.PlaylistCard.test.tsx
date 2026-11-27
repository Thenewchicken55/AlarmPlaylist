import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PlaylistCard from '../components/playlist/PlaylistCard'
import { makePlaylist, makeTrack } from './factories'

const playlist = makePlaylist({
  name: 'Morning Mix',
  tracks: [
    makeTrack({ id: 'a', title: 'Alpha', artist: 'A', url: 'https://x/a.mp3' }),
    makeTrack({ id: 'b', title: 'Beta' }),
  ],
})

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:m3u')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PlaylistCard', () => {
  it('summarises the playlist', () => {
    render(<PlaylistCard playlist={playlist} onClick={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('Morning Mix')).toBeInTheDocument()
    expect(screen.getByText(/2 tracks/)).toBeInTheDocument()
    expect(screen.getByText(/Alpha \+ 1 more/)).toBeInTheDocument()
  })

  it('opens the playlist on click, Enter or Space', () => {
    const onClick = vi.fn()
    render(<PlaylistCard playlist={playlist} onClick={onClick} onDelete={vi.fn()} />)
    // The card is the outer role=button; "More options" also mentions the name.
    const card = screen.getByText('Morning Mix').closest('[role="button"]') as HTMLElement

    fireEvent.click(screen.getByText('Morning Mix'))
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: ' ' })

    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('exports an M3U from the menu', () => {
    render(<PlaylistCard playlist={playlist} onClick={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /More options/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Export M3U/ }))

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:m3u')
  })

  it('disables export for an empty playlist', () => {
    render(<PlaylistCard playlist={makePlaylist({ name: 'Empty', tracks: [] })} onClick={vi.fn()} onDelete={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /More options/ }))

    expect(screen.getByRole('menuitem', { name: /Export M3U/ })).toBeDisabled()
  })

  it('deletes from the menu and closes it first', () => {
    const onDelete = vi.fn()
    render(<PlaylistCard playlist={playlist} onClick={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: /More options/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete/ }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
