import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor, cleanup, fireEvent } from '@testing-library/react'
import AlarmAlertOverlay from '../components/alarm/AlarmAlertOverlay'
import { useAlarmStore } from '../stores/alarmStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { usePlayerStore } from '../stores/playerStore'
import { makeAlarm, makePlaylist, makeTrack } from './factories'

const { audioPlayer, playFallbackAlarm, stopFallbackAlarm, getAudioSource, yt } = vi.hoisted(() => ({
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
  getAudioSource: vi.fn<(id: string) => Promise<{ url: string; format: string } | undefined>>(async () => ({
    url: 'blob:resolved',
    format: 'wav',
  })),
  yt: {
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

vi.mock('../services/player', () => ({ audioPlayer }))
vi.mock('../services/youtubePlayer', () => ({ youtubePlayer: yt }))
vi.mock('../utils/fallbackAlarm', () => ({ playFallbackAlarm, stopFallbackAlarm }))
vi.mock('../db/audioStorage', () => ({
  getAudioSource,
  getAudioUrl: vi.fn(async () => 'blob:first'),
  storeAudioFile: vi.fn(),
  deleteAudioFile: vi.fn(),
}))

const tracks = [
  makeTrack({ id: 't1', title: 'First Song', artist: 'Artist A', url: 'blob:first' }),
  makeTrack({ id: 't2', title: 'Second Song', artist: 'Artist B', url: 'blob:second' }),
]

const playlist = makePlaylist({ id: 'p1', name: 'Morning', tracks })

function activate(alarm = makeAlarm({ playlistId: 'p1' }), playlists = [playlist]) {
  useAlarmStore.setState({ alarms: [alarm], activeAlarmId: alarm.id })
  usePlaylistStore.setState({ playlists })
  return alarm
}

beforeEach(() => {
  vi.clearAllMocks()
  getAudioSource.mockResolvedValue({ url: 'blob:resolved', format: 'wav' })
  useAlarmStore.setState({ alarms: [], activeAlarmId: null })
  usePlaylistStore.setState({ playlists: [] })
  usePlayerStore.setState({ currentTrack: null, isPlaying: false, progress: 0 })
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

    activate()
    render(<AlarmAlertOverlay />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(clockRenders.mock.calls.length).toBeGreaterThan(1)
    expect(vi.mocked(Math.random).mock.calls.length).toBe(1)

    expect(screen.getByText('First Song')).toBeInTheDocument()
    expect(screen.queryByText('Second Song')).not.toBeInTheDocument()
    expect(audioPlayer.load).toHaveBeenCalledTimes(1)
    expect(audioPlayer.load.mock.calls[0][0]).toBe('blob:first')
  })

  it('honours a specific track instead of a random pick', () => {
    activate(makeAlarm({ playlistId: 'p1', specificTrackId: 't2' }))
    render(<AlarmAlertOverlay />)

    expect(screen.getByText('Second Song')).toBeInTheDocument()
    expect(audioPlayer.load.mock.calls[0][0]).toBe('blob:second')
  })

  it('plays the chosen track once even after several re-renders', () => {
    vi.useFakeTimers()
    activate()
    render(<AlarmAlertOverlay />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(audioPlayer.load).toHaveBeenCalledTimes(1)
  })

  it('starts playback when the playlist store finishes loading after the alarm', async () => {
    const alarm = makeAlarm({ playlistId: 'p1' })
    useAlarmStore.setState({ alarms: [alarm], activeAlarmId: alarm.id })

    render(<AlarmAlertOverlay />)
    expect(audioPlayer.load).not.toHaveBeenCalled()

    act(() => {
      usePlaylistStore.setState({ playlists: [playlist] })
    })

    await waitFor(() => expect(audioPlayer.load).toHaveBeenCalledTimes(1))
  })

  it('beeps instead of staying silent when the alarm has no playlist', async () => {
    activate(makeAlarm({ playlistId: null }))
    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(playFallbackAlarm).toHaveBeenCalled())
    expect(audioPlayer.load).not.toHaveBeenCalled()
  })

  it('beeps instead of staying silent when the playlist has no tracks', async () => {
    activate(makeAlarm({ playlistId: 'p1' }), [{ ...playlist, tracks: [] }])
    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(playFallbackAlarm).toHaveBeenCalled())
    expect(audioPlayer.load).not.toHaveBeenCalled()
  })
})

describe('AlarmAlertOverlay local audio', () => {
  it('passes the stored format when playing a blob-backed track', async () => {
    const blobTrack = makeTrack({ id: 't3', title: 'Blob Song', url: undefined, blobId: 'blob-3' })
    activate(makeAlarm({ playlistId: 'p1', specificTrackId: 't3' }), [{ ...playlist, tracks: [blobTrack] }])

    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(audioPlayer.load).toHaveBeenCalled())
    // Without the format hint Howler rejects blob URLs and the alarm is silent.
    expect(getAudioSource).toHaveBeenCalledWith('blob-3')
    expect(audioPlayer.load).toHaveBeenCalledWith('blob:resolved', expect.any(Object), 'wav')
  })

  it('falls back to the beep when stored audio disappeared', async () => {
    getAudioSource.mockResolvedValue(undefined)
    const blobTrack = makeTrack({ id: 't4', title: 'Lost', url: undefined, blobId: 'missing' })
    activate(makeAlarm({ playlistId: 'p1', specificTrackId: 't4' }), [{ ...playlist, tracks: [blobTrack] }])

    render(<AlarmAlertOverlay />)

    await waitFor(() => expect(playFallbackAlarm).toHaveBeenCalled())
    expect(audioPlayer.load).not.toHaveBeenCalled()
  })

  it('applies the alarm volume and fade after loading', async () => {
    activate(makeAlarm({ playlistId: 'p1', specificTrackId: 't1', volume: 80, fadeIn: true, fadeInDuration: 5 }))
    render(<AlarmAlertOverlay />)
    await waitFor(() => expect(audioPlayer.load).toHaveBeenCalled())

    const handlers = audioPlayer.load.mock.calls[0][1] as { onLoad: () => void }
    act(() => handlers.onLoad())

    expect(audioPlayer.setVolume).toHaveBeenCalledWith(10)
    expect(audioPlayer.play).toHaveBeenCalled()
    expect(audioPlayer.fade).toHaveBeenCalledWith(10, 80, 5000)
  })
})

describe('AlarmAlertOverlay dismiss and snooze', () => {
  it('dismisses, stops audio and resumes what was playing before', async () => {
    usePlayerStore.setState({ isPlaying: true })
    activate()
    render(<AlarmAlertOverlay />)
    await waitFor(() => expect(audioPlayer.load).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }))

    expect(audioPlayer.stop).toHaveBeenCalled()
    expect(audioPlayer.unload).toHaveBeenCalled()
    expect(useAlarmStore.getState().activeAlarmId).toBeNull()
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('snoozes for the configured time and re-opens the alarm', async () => {
    vi.useFakeTimers()
    const alarm = activate(makeAlarm({ id: 'snooze-1', playlistId: 'p1', snoozeMinutes: 1 }))
    render(<AlarmAlertOverlay />)

    fireEvent.click(screen.getByRole('button', { name: /Snooze 1m/ }))
    expect(useAlarmStore.getState().activeAlarmId).toBeNull()
    expect(audioPlayer.stop).toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(useAlarmStore.getState().activeAlarmId).toBe(alarm.id)
  })

  it('does nothing for an unknown active alarm id', () => {
    useAlarmStore.setState({ alarms: [], activeAlarmId: 'gone' })
    render(<AlarmAlertOverlay />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
