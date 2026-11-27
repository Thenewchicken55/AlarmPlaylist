import { describe, it, expect, vi, beforeEach } from 'vitest'

const audio = vi.hoisted(() => ({
  storeAudioFile: vi.fn<(file: File) => Promise<string>>(async (file) => `blob-${file.name}`),
  getAudioUrl: vi.fn<(id: string) => Promise<string>>(async (id) => `blob:${id}`),
  deleteAudioFile: vi.fn<(id: string) => Promise<void>>(async () => {}),
}))

const getAudioDuration = vi.hoisted(() => vi.fn<(file: File) => Promise<number>>(async () => 123))
const fetchYouTubePlaylist = vi.hoisted(() => vi.fn())

vi.mock('../db/audioStorage', () => audio)
vi.mock('../utils/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/audio')>()
  return { ...actual, getAudioDuration }
})
vi.mock('../services/youtube', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/youtube')>()
  return { ...actual, fetchYouTubePlaylist }
})

import { db } from '../db/db'
import { usePlaylistStore } from '../stores/playlistStore'
import { makePlaylist, makeTrack } from './factories'

const YT_PLAYLIST_ID = 'PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM'

beforeEach(async () => {
  vi.clearAllMocks()
  getAudioDuration.mockResolvedValue(123)
  await db.playlists.clear()
  usePlaylistStore.setState({ playlists: [], selectedPlaylistId: null, loading: false })
})

describe('playlist CRUD', () => {
  it('creates a playlist and persists it', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({
      name: 'Morning',
      source: 'local',
      color: '#22c55e',
    })

    expect(playlist).toMatchObject({ name: 'Morning', source: 'local', tracks: [], color: '#22c55e' })
    expect(usePlaylistStore.getState().playlists).toEqual([playlist])
    expect(await db.playlists.get(playlist.id)).toEqual(playlist)
  })

  it('updates a playlist in both state and IndexedDB', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Old', source: 'local' })
    await usePlaylistStore.getState().updatePlaylist(playlist.id, { name: 'New' })

    expect(usePlaylistStore.getState().playlists[0].name).toBe('New')
    expect((await db.playlists.get(playlist.id))?.name).toBe('New')
  })

  it('loads persisted playlists', async () => {
    await db.playlists.add(makePlaylist({ id: 'persisted', name: 'From disk' }))
    await usePlaylistStore.getState().loadPlaylists()

    expect(usePlaylistStore.getState()).toMatchObject({ loading: false })
    expect(usePlaylistStore.getState().playlists.map((p) => p.id)).toEqual(['persisted'])
  })

  it('deletes a playlist and every audio file it owns', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Delete me', source: 'local' })
    await usePlaylistStore.getState().updatePlaylist(playlist.id, {
      tracks: [makeTrack({ id: 't1', blobId: 'b1' }), makeTrack({ id: 't2', blobId: 'b2' })],
    })

    await usePlaylistStore.getState().deletePlaylist(playlist.id)

    expect(audio.deleteAudioFile.mock.calls.map(([id]) => id).sort()).toEqual(['b1', 'b2'])
    expect(usePlaylistStore.getState().playlists).toEqual([])
    expect(await db.playlists.get(playlist.id)).toBeUndefined()
  })
})

describe('local file import', () => {
  it('stores the file, keeps the format-bearing blob id, and strips the extension from the title', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Local', source: 'local' })

    await usePlaylistStore
      .getState()
      .importLocalFiles(playlist.id, [new File(['audio'], 'My Song.mp3', { type: 'audio/mpeg' })])

    expect(getAudioDuration).toHaveBeenCalled()
    expect(audio.storeAudioFile).toHaveBeenCalled()
    const [track] = usePlaylistStore.getState().playlists[0].tracks
    expect(track).toMatchObject({
      title: 'My Song',
      artist: 'Unknown Artist',
      duration: 123,
      source: 'local',
      blobId: 'blob-My Song.mp3',
      url: 'blob:blob-My Song.mp3',
    })
    expect((await db.playlists.get(playlist.id))?.tracks).toHaveLength(1)
  })

  it('skips a file it cannot decode instead of failing the whole import', async () => {
    getAudioDuration.mockImplementation(async (file: File) => {
      if (file.name === 'broken.mp3') throw new Error('no metadata')
      return 60
    })
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Local', source: 'local' })

    await usePlaylistStore
      .getState()
      .importLocalFiles(playlist.id, [
        new File(['x'], 'broken.mp3', { type: 'audio/mpeg' }),
        new File(['x'], 'good.wav', { type: 'audio/wav' }),
      ])

    const tracks = usePlaylistStore.getState().playlists[0].tracks
    expect(tracks.map((t) => t.title)).toEqual(['good'])
  })

  it('adds and removes tracks while keeping IndexedDB in sync', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Local', source: 'local' })
    const track = makeTrack({ id: 't1', blobId: 'b1' })

    await usePlaylistStore.getState().addTrack(playlist.id, track)
    expect(usePlaylistStore.getState().playlists[0].tracks).toEqual([track])

    await usePlaylistStore.getState().removeTrack(playlist.id, track.id)
    expect(usePlaylistStore.getState().playlists[0].tracks).toEqual([])
    expect(audio.deleteAudioFile).toHaveBeenCalledWith('b1')
    expect((await db.playlists.get(playlist.id))?.tracks).toEqual([])
  })
})

describe('reordering', () => {
  it('moves a track to the requested position', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Order', source: 'local' })
    await usePlaylistStore
      .getState()
      .updatePlaylist(playlist.id, { tracks: [makeTrack({ id: 'a' }), makeTrack({ id: 'b' }), makeTrack({ id: 'c' })] })

    await usePlaylistStore.getState().reorderTracks(playlist.id, 0, 2)

    expect(usePlaylistStore.getState().playlists[0].tracks.map((t) => t.id)).toEqual(['b', 'c', 'a'])
    expect((await db.playlists.get(playlist.id))?.tracks.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('YouTube refresh', () => {
  async function youtubePlaylist() {
    const playlist = await usePlaylistStore.getState().createPlaylist({
      name: 'YT',
      source: 'youtube',
      sourceUrl: `https://www.youtube.com/playlist?list=${YT_PLAYLIST_ID}`,
    })
    const local = makeTrack({ id: 'local-1', title: 'Local bonus' })
    const oldYt = makeTrack({ id: 'old-yt', title: 'Old', source: 'youtube', sourceId: 'old-yt' })
    await usePlaylistStore.getState().updatePlaylist(playlist.id, { tracks: [local, oldYt] })
    return { playlist, local }
  }

  it('replaces YouTube tracks but keeps local ones', async () => {
    const { playlist, local } = await youtubePlaylist()
    const fresh = [
      makeTrack({ id: 'yt-1', title: 'One', source: 'youtube', sourceId: 'yt-1' }),
      makeTrack({ id: 'yt-2', title: 'Two', source: 'youtube', sourceId: 'yt-2' }),
    ]
    fetchYouTubePlaylist.mockResolvedValue({ title: 'YT', tracks: fresh })

    const count = await usePlaylistStore.getState().refreshYouTubeTracks(playlist.id)

    expect(count).toBe(2)
    expect(fetchYouTubePlaylist).toHaveBeenCalledWith(YT_PLAYLIST_ID, undefined)
    expect(usePlaylistStore.getState().playlists[0].tracks.map((t) => t.id)).toEqual([local.id, 'yt-1', 'yt-2'])
    expect((await db.playlists.get(playlist.id))?.tracks).toHaveLength(3)
  })

  it('reports progress through to the caller', async () => {
    const { playlist } = await youtubePlaylist()
    const onProgress = vi.fn()
    fetchYouTubePlaylist.mockImplementation(async (_id: string, progress?: (loaded: number, total: number) => void) => {
      progress?.(1, 2)
      return { title: 'YT', tracks: [] }
    })

    await usePlaylistStore.getState().refreshYouTubeTracks(playlist.id, onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 2)
  })

  it('refuses a local playlist', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({ name: 'Local', source: 'local' })

    await expect(usePlaylistStore.getState().refreshYouTubeTracks(playlist.id)).rejects.toThrow(
      /Not a YouTube playlist/,
    )
  })

  it('refuses a YouTube playlist with an invalid source URL', async () => {
    const playlist = await usePlaylistStore.getState().createPlaylist({
      name: 'YT',
      source: 'youtube',
      sourceUrl: 'https://www.youtube.com/watch?v=nothing',
    })

    await expect(usePlaylistStore.getState().refreshYouTubeTracks(playlist.id)).rejects.toThrow(/Invalid YouTube/)
  })
})
