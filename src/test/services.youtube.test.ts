import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchYouTubePlaylist, getYouTubeApiKey, parseYouTubePlaylistUrl, setYouTubeApiKey } from '../services/youtube'

const videos = [
  { videoId: 'aaaaaaaaaaa', title: 'One', author: 'Channel', lengthSeconds: 100 },
  { videoId: 'bbbbbbbbbbb', title: 'Two', author: '', lengthSeconds: 200 },
]

function response(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

function mockFetch(handler: (url: string) => Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => handler(String(input))) as unknown as typeof fetch
}

async function failure(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (err) {
    return err as Error
  }
  throw new Error('expected the import to fail')
}

function createStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  } as Storage
}

beforeEach(() => {
  // The API key lives in localStorage; stub it so tests are isolated and do not
  // depend on the environment exposing a Storage implementation.
  vi.stubGlobal('localStorage', createStorage())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('parseYouTubePlaylistUrl', () => {
  it('accepts a watch URL with a list parameter', () => {
    expect(parseYouTubePlaylistUrl('https://www.youtube.com/watch?v=abc&list=PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')).toBe(
      'PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM',
    )
  })

  it('accepts a bare playlist id', () => {
    expect(parseYouTubePlaylistUrl('  PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM ')).toBe('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')
  })

  it('rejects anything that is not a playlist', () => {
    expect(parseYouTubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseYouTubePlaylistUrl('not a playlist')).toBeNull()
  })

  it('accepts short links, music.youtube.com and the other playlist id prefixes', () => {
    expect(parseYouTubePlaylistUrl('https://youtu.be/abc?list=PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')).toBe(
      'PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM',
    )
    expect(parseYouTubePlaylistUrl('https://music.youtube.com/playlist?list=RDy9cnE4zFi1ywX9zevyBLi')).toBe(
      'RDy9cnE4zFi1ywX9zevyBLi',
    )
    expect(parseYouTubePlaylistUrl('LLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')).toBe('LLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')
  })

  it('rejects malformed playlist ids', () => {
    expect(parseYouTubePlaylistUrl('PLshort')).toBeNull()
    expect(parseYouTubePlaylistUrl('https://www.youtube.com/playlist?list=not-an-id')).toBeNull()
    expect(parseYouTubePlaylistUrl('')).toBeNull()
  })
})

describe('fetchYouTubePlaylist (keyless Invidious)', () => {
  it('returns tracks and stops paging on an empty page', async () => {
    mockFetch((url) =>
      url.includes('page=2') ? response({ title: 'Mix', videos: [] }) : response({ title: 'Mix', videos }),
    )

    const result = await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')

    expect(result.title).toBe('Mix')
    expect(result.tracks).toHaveLength(2)
    expect(result.tracks[0]).toMatchObject({ title: 'One', artist: 'Channel', duration: 100, source: 'youtube' })
    // Missing channel names fall back rather than rendering an empty artist.
    expect(result.tracks[1].artist).toBe('YouTube')
    expect(result.partial).toBeUndefined()
  })

  it('reports a private or missing playlist honestly instead of blaming its size', async () => {
    mockFetch(() => response({ error: 'not found' }, 404))

    const error = await failure(fetchYouTubePlaylist('PLprivate'))

    expect(error.message).toMatch(/does not exist/)
    expect(error.message).toMatch(/Unlisted/)
    expect(error.message).not.toMatch(/too large/)
  })

  it('blames the instances, not the playlist, when every host is down', async () => {
    mockFetch(() => response({ error: 'boom' }, 503))

    const error = await failure(fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM'))

    expect(error.message).toMatch(/No Invidious instance/)
    expect(error.message).toMatch(/API key/)
    expect(error.message).not.toMatch(/does not exist/)
  })

  it('keeps the tracks it managed to load when a later page fails', async () => {
    mockFetch((url) => (url.includes('page=2') ? response({}, 500) : response({ title: 'Mix', videos })))

    const result = await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')

    expect(result.tracks).toHaveLength(2)
    expect(result.partial).toBe(true)
  })
})

describe('fetchYouTubePlaylist (keyless fallback)', () => {
  it('tries the next instance when an earlier one answers with no videos', async () => {
    mockFetch((url) => {
      if (url.includes('page=')) return response({ title: 'Mix', videos: [] })
      if (url.includes('inv.zzls.xyz')) return response({ title: 'Mix', videos })
      return response({ title: 'Mix', videos: [] })
    })

    const result = await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')

    expect(result.tracks).toHaveLength(2)
    expect(result.partial).toBeUndefined()
  })

  it('reports progress while paging', async () => {
    const onProgress = vi.fn()
    mockFetch((url) =>
      url.includes('page=') ? response({ title: 'Mix', videos: [] }) : response({ title: 'Mix', videos }),
    )

    await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM', onProgress)

    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })
})

describe('YouTube API key storage', () => {
  it('trims keys and removes them when cleared', () => {
    setYouTubeApiKey('  key-123  ')
    expect(getYouTubeApiKey()).toBe('key-123')

    setYouTubeApiKey('   ')
    expect(getYouTubeApiKey()).toBe('')
  })
})

describe('fetchYouTubePlaylist (API key)', () => {
  const item = (id: string) => ({
    snippet: { title: id.toUpperCase(), videoOwnerChannelTitle: 'Channel', resourceId: { videoId: id } },
  })

  function apiHandler(overrides: (url: string) => Response | undefined = () => undefined) {
    return (url: string): Response => {
      const override = overrides(url)
      if (override) return override
      if (url.includes('/playlists?')) {
        return response({ items: [{ snippet: { title: 'Big Mix' }, contentDetails: { itemCount: 3 } }] })
      }
      if (url.includes('/playlistItems')) {
        if (url.includes('pageToken=tok')) return response({ items: [item('c')] })
        return response({ nextPageToken: 'tok', items: [item('a'), item('b')] })
      }
      if (url.includes('/videos?')) {
        return response({
          items: ['a', 'b', 'c'].map((id) => ({ id, contentDetails: { duration: 'PT1H2M3S' } })),
        })
      }
      return response({}, 500)
    }
  }

  it('paginates and resolves ISO 8601 durations', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(apiHandler())

    const result = await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')

    expect(result.title).toBe('Big Mix')
    expect(result.tracks.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(result.tracks.every((t) => t.duration === 3723)).toBe(true)
    expect(result.partial).toBeUndefined()
  })

  it('reports progress against the declared item count', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(apiHandler())
    const onProgress = vi.fn()

    await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM', onProgress)

    expect(onProgress.mock.calls).toEqual([
      [2, 3],
      [3, 3],
    ])
  })

  it('keeps the first page when a later page fails', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(apiHandler((url) => (url.includes('pageToken=tok') ? response({}, 500) : undefined)))

    const result = await fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM')

    expect(result.tracks).toHaveLength(2)
    expect(result.partial).toBe(true)
  })

  it('explains quota exhaustion', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(() => response({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403))

    const error = await failure(fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM'))

    expect(error.message).toMatch(/quota/)
  })

  it('explains an invalid key instead of retrying keyless', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(() => response({ error: { errors: [{ reason: 'keyInvalid' }] } }, 403))

    const error = await failure(fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM'))

    expect(error.message).toMatch(/invalid/)
  })

  it('explains a missing playlist', async () => {
    setYouTubeApiKey('test-key')
    mockFetch(() => response({}, 404))

    const error = await failure(fetchYouTubePlaylist('PLy9cnE4zFi1ywX9zevyBLizMutqab_MqM'))

    expect(error.message).toMatch(/not found/i)
  })
})
