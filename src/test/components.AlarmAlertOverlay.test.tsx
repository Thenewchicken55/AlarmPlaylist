import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import AlarmAlertOverlay from '../components/alarm/AlarmAlertOverlay'
import { useAlarmStore } from '../stores/alarmStore'
import { usePlaylistStore } from '../stores/playlistStore'
import type { Alarm, Playlist, Track } from '../types'

const { audioPlayer, playFallbackAlarm, stopFallbackAlarm, getAudioUrl } = vi.hoisted(() => ({
  audioPlayer: {
    load: vi.fn(),
    play: vi.fn(),
    stop: vi.fn(),
    unload: vi.fn(),
    setVolume: vi.fn(),
    fade: vi.fn(),
  },
  playFallbackAlarm: vi.fn(),
  stopFallbackAlarm: vi.fn(),
  getAudioUrl: vi.fn(async () => 'blob:resolved'),
}))

vi.mock('../services/player', () => ({ audioPlayer }))
vi.mock('../services/youtubePlayer', () => ({
  youtubePlayer: {
    mute: vi.fn(),
    unmute: vi.fn(),
    load: vi.fn(),
    play: vi.fn(),
    isPlaying: vi.fn(() => false),
    setVolume: vi.fn(),
    fade: vi.fn(),
    stop: vi.fn(),
    unload: vi.fn(),
  },
}))
vi.mock('../utils/fallbackAlarm', () => ({ playFallbackAlarm, stopFallbackAlarm }))
vi.mock('../db/audioStorage', () => ({
  getAudioUrl,
  storeAudioFile: vi.fn(),
  deleteAudioFile: vi.fn(),
}))

const tracks: Track[] = [
  { id: 't1', title: 'First Song', artist: 'Artist A', duration: 100, url: 'blob:first', source: 'local' },
  { id: 't2', title: 'Second Song', artist: 'Artist B', duration: 100, url: 'blob:second', source: 'local' },
]

const playlist: Playlist = {
  id: 'p1',
  name: 'Morning',
  source: 'local',
  tracks,
  color: '#6366f1',
  createdAt: 0,
}

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-1',
    name: 'wake up',
    hour: 7,
    minute: 30,
    days: [],
    enabled: true,
    playlistId: 'p1',
    specificTrackId: null,
    volume: 70,
    fadeIn: false,
    fadeInDuration: 5,
    snoozeMinutes: 5,
    maxSnoozes: 3,
    createdAt: 0,
    ...overrides,
  }
}

function activate(alarm: Alarm, playlists: Playlist[]) {
  useAlarmStore.setState({ alarms: [alarm], activeAlarmId: alarm.id })
  usePlaylistStore.setState({ playlists })
}

beforeEach(() => {
  vi.clearAllMocks()
  useAlarmStore.setState({ alarms: [], activeAlarmId: null })
  usePlaylistStore.setState({ playlists: [] })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('AlarmAlertOverlay track selection', () => {
  it('keeps the randomly picked track stable while the clock ticks', () => {
    vi.useFakeTimers()
    // A different value on every call: if the pick were recomputed on render,
    // the overlay would show the other track on each tick.
    const values = [0, 0.99]
    let calls = 0
    vi.spyOn(Math, 'random').mockImplementation(() => values[calls++ % values.length])
    const clockRenders = vi.spyOn(Date.prototype, 'toLocaleTimeString')

    activate(makeAlarm(), [playlist])
    render(<AlarmAlertOverlay />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // The clock ticked (so the overlay really re-rendered) but the pick was
    // still made exactly once.
    expect(clockRenders.mock.calls.length).toBeGreaterThan(1)
    expect(vi.mocked(Math.random).mock.calls.length).toBe(1)

    expect(screen.getByText('First Song')).toBeInTheDocument()
    expect(screen.queryByText('Second Song')).not.toBeInTheDocument()
    expect(audioPlayer.load).toHaveBeenCalledTimes(1)
    expect(audioPlayer.load.mock.calls[0][0]).toBe('blob:first')
  })

  it('plays the chosen track once even after several re-renders', () => {
    vi.useFakeTimers()
    activate(makeAlarm(), [playlist])
    render(<AlarmAlertOverlay />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(audioPlayer.load).toHaveBeenCalledTimes(1)
  })

  it('starts playback when the playlist store finishes loading after the alarm', async () => {
    const alarm = makeAlarm()
    useAlarmStore.setState({ alarms: [alarm], activeAlarmId: alarm.id })
    usePlaylistStore.setState({ playlists: [] })

    render(<AlarmAlertOverlay />)
    expect(audioPlayer.load).not.toHaveBeenCalled()

    act(() => {
      usePlaylistStore.setState({ playlists: [playlist] })
    })

    await waitFor(() => expect(audioPlayer.load).toHaveBeenCalledTimes(1))
  })

  it('beeps instead of staying silent when the alarm has no playlist', async () => {
    activate(makeAlarm({ playlistId: null }), [playlist])
    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(playFallbackAlarm).toHaveBeenCalled())
    expect(audioPlayer.load).not.toHaveBeenCalled()
  })

  it('beeps instead of staying silent when the playlist has no tracks', async () => {
    activate(makeAlarm(), [{ ...playlist, tracks: [] }])
    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(playFallbackAlarm).toHaveBeenCalled())
    expect(audioPlayer.load).not.toHaveBeenCalled()
  })
})
