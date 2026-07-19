import type { Track } from '../types'

type InvidiousVideo = {
  videoId: string
  title: string
  author: string
  lengthSeconds: number
  videoThumbnails?: { url: string; quality: string; width: number; height: number }[]
}

type InvidiousPlaylistResponse = {
  title: string
  videos: InvidiousVideo[]
}

const INSTANCES = ['inv.nadeko.net', 'inv.vern.cc']

export function parseYouTubePlaylistUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const list = u.searchParams.get('list')
    if (list && isPlaylistId(list)) return list
    // Also accept youtube.com/playlist?list=... and youtu.be/...?list=...
    // (already covered by the searchParams check above).
  } catch {
    // Not a URL — fall through to bare-id check below.
  }
  // Bare playlist IDs (e.g. pasted directly): must start with a known prefix
  // and be 13-34 chars. This rejects 11-char video IDs, which would otherwise
  // hit the `/playlists/{id}` endpoint and 404.
  if (isPlaylistId(url.trim())) return url.trim()
  return null
}

function isPlaylistId(s: string): boolean {
  // YouTube playlist IDs start with PL/LL/FL/RD/UL/PU and are 13-34 chars of
  // [A-Za-z0-9_-]. See https://webapps.stackexchange.com/a/106239
  return /^(PL|LL|FL|RD|UL|PU)[A-Za-z0-9_-]{10,32}$/.test(s)
}

function playlistUrl(host: string, playlistId: string): string {
  return `https://${host}/api/v1/playlists/${playlistId}`
}

export async function fetchYouTubePlaylist(playlistId: string): Promise<{ title: string; tracks: Track[] }> {
  const errors: string[] = []

  // In dev, Vite proxies /api/invidious → inv.nadeko.net (avoids CORS).
  // In production, try direct fetch (inv.nadeko.net sends ACAO: *).
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

      const tracks: Track[] = data.videos.map((v) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author || 'YouTube',
        duration: v.lengthSeconds,
        thumbnail: v.videoThumbnails?.find((t) => t.quality === 'default')?.url ?? v.videoThumbnails?.[0]?.url,
        source: 'youtube' as const,
        sourceId: v.videoId,
      }))

      return { title: data.title, tracks }
    } catch (err) {
      errors.push(`${url} — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(`Could not fetch playlist from any Invidious instance.\n${errors.join('\n')}`)
}
