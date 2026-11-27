import type { Alarm, Playlist, Track } from '../types'

/** Shared builders so every test describes only the fields it cares about. */
export function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    duration: 180,
    source: 'local',
    ...overrides,
  }
}

export function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    name: 'Test Playlist',
    source: 'local',
    tracks: [],
    color: '#6366f1',
    createdAt: 0,
    ...overrides,
  }
}

export function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: 'alarm-1',
    name: 'Test Alarm',
    hour: 7,
    minute: 0,
    days: [],
    enabled: true,
    playlistId: null,
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
