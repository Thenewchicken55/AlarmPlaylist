import type { Track } from '../types'

// ─── Shared types ────────────────────────────────────────────────────────

type InvidiousVideo = {
  videoId: string
  title: string
  author: string
  lengthSeconds: number
}

type InvidiousPlaylistResponse = {
  title: string
  videos: InvidiousVideo[]
}

// ─── URL parsing ─────────────────────────────────────────────────────────

export function parseYouTubePlaylistUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const list = u.searchParams.get('list')
    if (list && isPlaylistId(list)) return list
  } catch {
    // Not a URL — fall through to bare-id check below.
  }
  if (isPlaylistId(url.trim())) return url.trim()
  return null
}

function isPlaylistId(s: string): boolean {
  return /^(PL|LL|FL|RD|UL|PU)[A-Za-z0-9_-]{10,32}$/.test(s)
}

// ─── API key storage ─────────────────────────────────────────────────────

const API_KEY_STORAGE = 'youtube_api_key'

export function getYouTubeApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE)?.trim() ?? ''
}

export function setYouTubeApiKey(key: string) {
  const trimmed = key.trim()
  if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed)
  else localStorage.removeItem(API_KEY_STORAGE)
}

// ─── Invidious (keyless, default) ────────────────────────────────────────

const INSTANCES = ['inv.nadeko.net', 'inv.vern.cc']

function playlistUrl(host: string, playlistId: string): string {
  return `https://${host}/api/v1/playlists/${playlistId}`
}

async function fetchViaInvidious(
  playlistId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ title: string; tracks: Track[] }> {
  const errors: string[] = []

  const urls: string[] = []
  if (import.meta.env.DEV) {
    urls.push(`/api/invidious/api/v1/playlists/${playlistId}`)
  }
  for (const instance of INSTANCES) {
    urls.push(playlistUrl(instance, playlistId))
  }

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        errors.push(`${url} returned ${res.status}`)
        continue
      }
      const data: InvidiousPlaylistResponse = await res.json()

      if (!data.videos || data.videos.length === 0) {
        errors.push(`${url} returned 0 videos (playlist may be too large for keyless import)`)
        continue
      }

      const tracks: Track[] = data.videos.map((v) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author || 'YouTube',
        duration: v.lengthSeconds,
        source: 'youtube' as const,
        sourceId: v.videoId,
      }))

      onProgress?.(tracks.length, tracks.length)
      return { title: data.title, tracks }
    } catch (err) {
      errors.push(`${url} — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(
    `Could not fetch playlist from Invidious (it may be too large or unindexed). ` +
      `Add a YouTube API key in Settings for reliable large-playlist support.\n${errors.join('\n')}`,
  )
}

// ─── YouTube Data API v3 (with key, handles large playlists) ────────────

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

type PlaylistItemsResponse = {
  nextPageToken?: string
  items: {
    snippet: {
      title: string
      videoOwnerChannelTitle?: string
      resourceId: { videoId: string }
    }
  }[]
}

type VideosResponse = {
  items: {
    id: string
    contentDetails: { duration: string }
  }[]
}

type PlaylistMetaResponse = {
  items?: {
    snippet: { title: string }
    contentDetails: { itemCount: number }
  }[]
}

/** Parse ISO 8601 duration (e.g. "PT1M30S") to seconds. */
function parseISODuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const [, h, min, s] = m
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0)
}

async function fetchViaYouTubeAPI(
  playlistId: string,
  apiKey: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ title: string; tracks: Track[] }> {
  // 1. Get playlist title + total count
  const metaRes = await fetch(`${YT_API_BASE}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`)
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({}))
    const reason = body?.error?.errors?.[0]?.reason ?? metaRes.status
    if (reason === 'quotaExceeded') {
      throw new Error('YouTube API daily quota exceeded. Try again tomorrow or use a different key.')
    }
    if (metaRes.status === 403) {
      throw new Error('YouTube API key is invalid or does not have access. Check Settings.')
    }
    if (metaRes.status === 404) {
      throw new Error('Playlist not found. Check the URL.')
    }
    throw new Error(`YouTube API error: ${reason} (${metaRes.status})`)
  }

  const meta: PlaylistMetaResponse = await metaRes.json()
  if (!meta.items?.length) throw new Error('Playlist not found or is private.')
  const title = meta.items[0].snippet.title
  const total = meta.items[0].contentDetails.itemCount

  // 2. Paginate playlistItems (50 per page) + fetch durations in batches
  const tracks: Track[] = []
  let pageToken: string | undefined = undefined

  do {
    const url =
      `${YT_API_BASE}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}` +
      (pageToken ? `&pageToken=${pageToken}` : '')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
    const data: PlaylistItemsResponse = await res.json()

    // Collect video IDs for the duration lookup
    const pageItems = data.items
      .filter((item) => item.snippet?.resourceId?.videoId)
      .map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        author: item.snippet.videoOwnerChannelTitle || 'YouTube',
      }))

    // Fetch durations for this batch (videos.list, up to 50 IDs per call)
    const videoIds = pageItems.map((p) => p.videoId)
    const durations = new Map<string, number>()

    if (videoIds.length > 0) {
      const vidRes = await fetch(`${YT_API_BASE}/videos?part=contentDetails&id=${videoIds.join(',')}&key=${apiKey}`)
      if (vidRes.ok) {
        const vidData: VideosResponse = await vidRes.json()
        for (const item of vidData.items) {
          durations.set(item.id, parseISODuration(item.contentDetails.duration))
        }
      }
    }

    for (const item of pageItems) {
      tracks.push({
        id: item.videoId,
        title: item.title,
        artist: item.author,
        duration: durations.get(item.videoId) ?? 0,
        source: 'youtube' as const,
        sourceId: item.videoId,
      })
    }

    onProgress?.(tracks.length, total)
    pageToken = data.nextPageToken
  } while (pageToken)

  return { title, tracks }
}

// ─── Public entry point ──────────────────────────────────────────────────

export async function fetchYouTubePlaylist(
  playlistId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ title: string; tracks: Track[] }> {
  const apiKey = getYouTubeApiKey()
  if (apiKey) {
    return fetchViaYouTubeAPI(playlistId, apiKey, onProgress)
  }
  return fetchViaInvidious(playlistId, onProgress)
}
