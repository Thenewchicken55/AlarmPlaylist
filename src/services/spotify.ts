import type { Playlist, Track } from '../types'

const AUTH_URL = 'https://accounts.spotify.com/authorize'
const API_BASE = 'https://api.spotify.com/v1'
const SCOPES = 'playlist-read-private playlist-read-collaborative'

let accessToken: string | null = null
let codeVerifier: string | null = null

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length)
  }
  return result
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function isSpotifyConnected(): boolean {
  return !!accessToken
}

export function getSpotifyAccessToken(): string | null {
  return accessToken
}

export async function authenticateSpotify(clientId: string, redirectUri: string): Promise<void> {
  codeVerifier = generateRandomString(64)
  const challenge = await sha256(codeVerifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })

  sessionStorage.setItem('spotify_code_verifier', codeVerifier)
  sessionStorage.setItem('spotify_redirect_uri', redirectUri)

  window.location.href = `${AUTH_URL}?${params}`
}

export async function handleSpotifyCallback(code: string): Promise<string | null> {
  const cv = sessionStorage.getItem('spotify_code_verifier')
  const redirectUri = sessionStorage.getItem('spotify_redirect_uri')

  if (!cv || !redirectUri) return null

  sessionStorage.removeItem('spotify_code_verifier')
  sessionStorage.removeItem('spotify_redirect_uri')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: cv,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  accessToken = data.access_token
  return accessToken
}

export async function fetchSpotifyPlaylists(): Promise<Playlist[]> {
  if (!accessToken) return []
  const playlists: Playlist[] = []
  let url: string | null = `${API_BASE}/me/playlists?limit=50`

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error('Failed to fetch Spotify playlists')
    const data = await res.json()

    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        name: item.name,
        source: 'spotify',
        tracks: [],
        color: '#1db954',
        createdAt: new Date(item.snapshot_id || Date.now()).getTime(),
      })
    }
    url = data.next
  }

  return playlists
}

export async function fetchSpotifyPlaylistTracks(playlistId: string): Promise<Track[]> {
  if (!accessToken) return []
  const tracks: Track[] = []
  let url: string | null = `${API_BASE}/playlists/${playlistId}/tracks?limit=100`

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error('Failed to fetch Spotify tracks')
    const data = await res.json()

    for (const item of data.items || []) {
      const t = item.track
      if (!t) continue
      tracks.push({
        id: t.id,
        title: t.name,
        artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        duration: Math.floor(t.duration_ms / 1000),
        url: t.preview_url || undefined,
        thumbnail: t.album?.images?.[0]?.url,
        source: 'spotify',
        sourceId: t.id,
      })
    }
    url = data.next
  }

  return tracks
}
