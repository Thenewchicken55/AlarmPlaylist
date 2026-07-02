import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { db } from '../db/db'
import { storeAudioFile, deleteAudioFile, getAudioUrl } from '../db/audioStorage'
import { getAudioDuration } from '../utils/audio'
import type { Playlist, Track, PlaylistSource } from '../types'

interface CreatePlaylistInput {
  name: string
  source: PlaylistSource
  sourceUrl?: string
  color?: string
}

interface PlaylistState {
  playlists: Playlist[]
  selectedPlaylistId: string | null
  loading: boolean

  loadPlaylists: () => Promise<void>
  createPlaylist: (input: CreatePlaylistInput) => Promise<Playlist>
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  selectPlaylist: (id: string | null) => void

  addTrack: (playlistId: string, track: Track) => Promise<void>
  removeTrack: (playlistId: string, trackId: string) => Promise<void>
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>

  importLocalFiles: (playlistId: string, files: FileList) => Promise<void>
}

function generateId(): string {
  return nanoid()
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  selectedPlaylistId: null,
  loading: false,

  loadPlaylists: async () => {
    set({ loading: true })
    try {
      const playlists = await db.playlists.toArray()
      set({ playlists, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createPlaylist: async (input) => {
    const playlist: Playlist = {
      id: generateId(),
      name: input.name,
      source: input.source,
      sourceUrl: input.sourceUrl,
      tracks: [],
      color: input.color ?? '#6366f1',
      createdAt: Date.now(),
    }
    await db.playlists.add(playlist)
    set((s) => ({ playlists: [...s.playlists, playlist] }))
    return playlist
  },

  updatePlaylist: async (id, data) => {
    await db.playlists.update(id, data)
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }))
  },

  deletePlaylist: async (id) => {
    const playlist = get().playlists.find((p) => p.id === id)
    if (playlist) {
      for (const track of playlist.tracks) {
        if (track.blobId) await deleteAudioFile(track.blobId)
      }
    }
    await db.playlists.delete(id)
    set((s) => ({
      playlists: s.playlists.filter((p) => p.id !== id),
      selectedPlaylistId: s.selectedPlaylistId === id ? null : s.selectedPlaylistId,
    }))
  },

  selectPlaylist: (id) => set({ selectedPlaylistId: id }),

  addTrack: async (playlistId, track) => {
    const playlist = get().playlists.find((p) => p.id === playlistId)
    if (!playlist) return
    const updated = { ...playlist, tracks: [...playlist.tracks, track] }
    await db.playlists.update(playlistId, { tracks: updated.tracks })
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  removeTrack: async (playlistId, trackId) => {
    const playlist = get().playlists.find((p) => p.id === playlistId)
    if (!playlist) return
    const track = playlist.tracks.find((t) => t.id === trackId)
    if (track?.blobId) await deleteAudioFile(track.blobId)
    const updated = { ...playlist, tracks: playlist.tracks.filter((t) => t.id !== trackId) }
    await db.playlists.update(playlistId, { tracks: updated.tracks })
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  reorderTracks: async (playlistId, fromIndex, toIndex) => {
    const playlist = get().playlists.find((p) => p.id === playlistId)
    if (!playlist) return
    const tracks = [...playlist.tracks]
    const [moved] = tracks.splice(fromIndex, 1)
    tracks.splice(toIndex, 0, moved)
    const updated = { ...playlist, tracks }
    await db.playlists.update(playlistId, { tracks })
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },

  importLocalFiles: async (playlistId, fileList) => {
    const files = Array.from(fileList)
    const tracks: Track[] = []

    for (const file of files) {
      try {
        const duration = await getAudioDuration(file)
        const blobId = await storeAudioFile(file)
        const url = await getAudioUrl(blobId)
        tracks.push({
          id: generateId(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          duration,
          url,
          source: 'local',
          blobId,
        })
      } catch {
        continue
      }
    }

    const playlist = get().playlists.find((p) => p.id === playlistId)
    if (!playlist) return
    const updated = { ...playlist, tracks: [...playlist.tracks, ...tracks] }
    await db.playlists.update(playlistId, { tracks: updated.tracks })
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }))
  },
}))
