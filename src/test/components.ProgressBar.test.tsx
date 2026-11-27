import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ProgressBar from '../components/player/ProgressBar'
import AudioPlayerContext from '../components/player/AudioPlayerContext'

const seek = vi.fn<(percent: number) => void>()

function renderBar(progress = 10, duration = 100) {
  return render(
    <AudioPlayerContext value={{ seek }}>
      <ProgressBar progress={progress} duration={duration} />
    </AudioPlayerContext>,
  )
}

beforeEach(() => {
  seek.mockReset()
})

describe('ProgressBar', () => {
  it('seeks to the clicked position', () => {
    renderBar()
    const bar = screen.getByRole('slider')
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      height: 8,
      right: 200,
      bottom: 8,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    fireEvent.click(bar, { clientX: 100 })

    expect(seek).toHaveBeenCalledWith(50)
  })

  it('clamps clicks outside the bar', () => {
    renderBar()
    const bar = screen.getByRole('slider')
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({
      left: 50,
      width: 100,
      top: 0,
      height: 8,
      right: 150,
      bottom: 8,
      x: 50,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    fireEvent.click(bar, { clientX: 0 })
    expect(seek).toHaveBeenLastCalledWith(0)

    fireEvent.click(bar, { clientX: 400 })
    expect(seek).toHaveBeenLastCalledWith(100)
  })

  it('steps 5 seconds with the arrow keys and jumps with Home/End', () => {
    renderBar(10, 100)
    const bar = screen.getByRole('slider')

    fireEvent.keyDown(bar, { key: 'ArrowRight' })
    expect(seek).toHaveBeenLastCalledWith(15)

    fireEvent.keyDown(bar, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenLastCalledWith(5)

    fireEvent.keyDown(bar, { key: 'Home' })
    expect(seek).toHaveBeenLastCalledWith(0)

    fireEvent.keyDown(bar, { key: 'End' })
    expect(seek).toHaveBeenLastCalledWith(100)
  })

  it('ignores seeks while the duration is unknown', () => {
    renderBar(0, 0)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(seek).not.toHaveBeenCalled()
  })
})
