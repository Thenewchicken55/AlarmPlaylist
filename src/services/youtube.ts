import type { Playlist, Track } from '../types'

const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly'

type TokenClient = {
  requestAccessToken: (overrideConfig?: { hint?: string }) => void
}

let tokenClient: TokenClient | null = null
let accessToken: string | null = null

export function isYouTubeConnected(): boolean {
  return !!accessToken
}

export function getYouTubeAccessToken(): string | null {
  return accessToken
}

export async function initYouTubeClient(clientId: string): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.access_token) {
          accessToken = resp.access_token
        }
      },
    }) as unknown as TokenClient
    return
  }

  if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
    return
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      if (!window.google?.accounts?.oauth2) { resolve(); return }
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: { access_token?: string; error?: string }) => {
          if (resp.access_token) {
            accessToken = resp.access_token
          }
        },
      }) as unknown as TokenClient
      resolve()
    }
    document.body.appendChild(script)
  })
}

export async function authenticateYouTube(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!tokenClient) {
      resolve(null)
      return
    }

    tokenClient.requestAccessToken()

    const check = setInterval(() => {
      if (accessToken) {
        clearInterval(check)
        resolve(accessToken)
      }
    }, 200)

    setTimeout(() => {
      clearInterval(check)
      resolve(null)
    }, 30000)
  })
}

export async function fetchYouTubePlaylists(): Promise<Playlist[]> {
  if (!accessToken) return []
  const playlists: Playlist[] = []
  let pageToken = ''

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50&pageToken=${pageToken}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`YouTube API Error: ${errData.error?.message || res.statusText}`)
    }
    const data = await res.json()

    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        name: item.snippet.title,
        source: 'youtube',
        tracks: [],
        color: '#ff0000',
        createdAt: new Date(item.snippet.publishedAt).getTime(),
      })
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return playlists
}

export async function fetchYouTubePlaylistTracks(playlistId: string): Promise<Track[]> {
  if (!accessToken) return []
  const tracks: Track[] = []
  let pageToken = ''

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`YouTube API Error: ${errData.error?.message || res.statusText}`)
    }
    const data = await res.json()

    for (const item of data.items || []) {
      const snippet = item.snippet
      tracks.push({
        id: item.id || item.contentDetails?.videoId,
        title: snippet.title,
        artist: snippet.videoOwnerChannelTitle || 'YouTube',
        duration: 0,
        thumbnail: snippet.thumbnails?.default?.url,
        source: 'youtube',
        sourceId: item.contentDetails?.videoId,
      })
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)

  return tracks
}
