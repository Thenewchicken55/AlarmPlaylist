import type { Track } from '../types'

type YouTubePlaylistItem = {
  contentDetails?: { videoId?: string }
  snippet: {
    title: string
    videoOwnerChannelTitle?: string
    thumbnails?: { default?: { url: string } }
  }
}

const API_BASE = 'https://www.googleapis.com/youtube/v3'

export function parseYouTubePlaylistUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const list = u.searchParams.get('list')
    if (list) return list
  } catch {
    // Not a valid URL
  }
  if (/^[a-zA-Z0-9_-]{11,34}$/.test(url)) return url
  return null
}

async function fetchWithPagination<T>(
  endpoint: string,
  params: Record<string, string>,
  extractItem: (item: YouTubePlaylistItem) => T | null,
): Promise<T[]> {
  const items: T[] = []
  let pageToken = ''

  do {
    const query = new URLSearchParams({ ...params, pageToken, maxResults: '50' })
    const res = await fetch(`${API_BASE}/${endpoint}?${query}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `YouTube API error: ${res.status}`)
    }
    const data: { items?: YouTubePlaylistItem[]; nextPageToken?: string } = await res.json()

    for (const item of data.items ?? []) {
      const extracted = extractItem(item)
      if (extracted) items.push(extracted)
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return items
}

export async function fetchYouTubePlaylist(
  playlistId: string,
  apiKey: string,
): Promise<{ title: string; tracks: Track[] }> {
  const infoUrl = `${API_BASE}/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
  const infoRes = await fetch(infoUrl)
  if (!infoRes.ok) {
    const err = await infoRes.json().catch(() => ({}))
    throw new Error(err?.error?.message || `YouTube API error: ${infoRes.status}`)
  }
  const infoData = await infoRes.json()
  const title = infoData.items?.[0]?.snippet?.title ?? 'Untitled Playlist'

  const tracks = await fetchWithPagination<Track>(
    'playlistItems',
    { part: 'snippet,contentDetails', playlistId, key: apiKey },
    (item: YouTubePlaylistItem) => {
      const videoId = item.contentDetails?.videoId
      if (!videoId) return null
      return {
        id: videoId,
        title: item.snippet.title,
        artist: item.snippet.videoOwnerChannelTitle || 'YouTube',
        duration: 0,
        thumbnail: item.snippet.thumbnails?.default?.url,
        source: 'youtube' as const,
        sourceId: videoId,
      }
    },
  )

  return { title, tracks }
}
