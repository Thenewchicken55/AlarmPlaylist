export type PlaylistSource = 'local' | 'youtube'

export interface Track {
  id: string
  title: string
  artist: string
  duration: number
  url?: string
  thumbnail?: string
  source: PlaylistSource
  sourceId?: string
  blobId?: string
}

export interface Playlist {
  id: string
  name: string
  source: PlaylistSource
  sourceUrl?: string
  tracks: Track[]
  color: string
  createdAt: number
}

export interface Alarm {
  id: string
  name: string
  hour: number
  minute: number
  days: number[]
  enabled: boolean
  playlistId: string | null
  specificTrackId: string | null
  volume: number
  fadeIn: boolean
  fadeInDuration: number
  snoozeMinutes: number
  maxSnoozes: number
  createdAt: number
}
