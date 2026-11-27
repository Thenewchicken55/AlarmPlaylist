import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { usePlayerStore } from '../stores/playerStore'
import { makeTrack } from './factories'

const a = makeTrack({ id: 'a', title: 'A' })
const b = makeTrack({ id: 'b', title: 'B' })
const c = makeTrack({ id: 'c', title: 'C' })

function press(key: string, target: EventTarget = window) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

beforeEach(() => {
  usePlayerStore.setState({
    currentTrack: a,
    queue: [a, b, c],
    queueIndex: 1,
    isPlaying: true,
    progress: 0,
    volume: 70,
    shuffle: false,
    repeat: 'none',
  })
  renderHook(() => useKeyboardShortcuts())
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useKeyboardShortcuts', () => {
  it('toggles play/pause with space when a track is loaded', () => {
    press(' ')
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    press(' ')
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('does not resume when nothing is loaded', () => {
    act(() => usePlayerStore.setState({ currentTrack: null, isPlaying: false }))
    press(' ')
    expect(usePlayerStore.getState().isPlaying).toBe(false)
  })

  it('skips forward and backward with the arrow keys', () => {
    press('ArrowRight')
    expect(usePlayerStore.getState().currentTrack?.id).toBe('c')

    act(() => usePlayerStore.setState({ queueIndex: 1, currentTrack: b }))
    press('ArrowLeft')
    expect(usePlayerStore.getState().currentTrack?.id).toBe('a')
  })

  it('changes and clamps the volume', () => {
    press('ArrowUp')
    expect(usePlayerStore.getState().volume).toBe(75)

    act(() => usePlayerStore.setState({ volume: 98 }))
    press('ArrowUp')
    expect(usePlayerStore.getState().volume).toBe(100)

    press('ArrowDown')
    expect(usePlayerStore.getState().volume).toBe(95)

    act(() => usePlayerStore.setState({ volume: 2 }))
    press('ArrowDown')
    expect(usePlayerStore.getState().volume).toBe(0)
  })

  it('mutes with m and restores the default volume', () => {
    press('m')
    expect(usePlayerStore.getState().volume).toBe(0)
    press('M')
    expect(usePlayerStore.getState().volume).toBe(70)
  })

  it('ignores keystrokes typed into form fields', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    press(' ', input)
    press('ArrowRight', input)
    press('m', input)

    expect(usePlayerStore.getState()).toMatchObject({ isPlaying: true, currentTrack: a, volume: 70 })
  })
})
