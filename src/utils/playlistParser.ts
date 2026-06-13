import type { Track } from '../types'

function generateId(): string {
  return crypto.randomUUID()
}

export function parseM3U(content: string, basePath: string): Track[] {
  const lines = content.split('\n')
  const tracks: Track[] = []
  let extinf: { title: string; artist: string; duration: number } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#EXTM3U')) continue
    if (trimmed.startsWith('#EXTINF:')) {
      const match = trimmed.match(/#EXTINF:(?<duration>-?\d+),(?<artist>.+?)\s*-\s*(?<title>.+)/)
      if (match?.groups) {
        extinf = {
          duration: Math.max(0, parseInt(match.groups.duration)),
          artist: match.groups.artist.trim(),
          title: match.groups.title.trim(),
        }
      } else {
        const fallback = trimmed.match(/#EXTINF:(?<duration>-?\d+),(?<title>.+)/)
        if (fallback?.groups) {
          extinf = {
            duration: Math.max(0, parseInt(fallback.groups.duration)),
            artist: 'Unknown Artist',
            title: fallback.groups.title.trim(),
          }
        }
      }
      continue
    }
    if (trimmed && !trimmed.startsWith('#')) {
      const path = trimmed.startsWith('http') ? trimmed : resolvePath(basePath, trimmed)
      const name = trimmed.split('/').pop()?.split('\\').pop()?.replace(/\.[^/.]+$/, '') ?? 'Unknown'
      tracks.push({
        id: generateId(),
        title: extinf?.title ?? name,
        artist: extinf?.artist ?? 'Unknown Artist',
        duration: extinf?.duration ?? 0,
        url: path,
        source: 'local',
      })
      extinf = null
    }
  }

  return tracks
}

export function parsePLS(content: string, basePath: string): Track[] {
  const lines = content.split('\n')
  const tracks: Track[] = []
  let currentEntry: number | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[playlist]')) continue
    if (trimmed.startsWith('NumberOfEntries=')) continue
    if (trimmed.startsWith('Version=')) continue

    const fileMatch = trimmed.match(/^File\d+=(.+)/)
    if (fileMatch) {
      const path = fileMatch[1].trim()
      const url = path.startsWith('http') ? path : resolvePath(basePath, path)
      const name = path.split('/').pop()?.split('\\').pop()?.replace(/\.[^/.]+$/, '') ?? 'Unknown'
      tracks.push({
        id: generateId(),
        title: name,
        artist: 'Unknown Artist',
        duration: 0,
        url,
        source: 'local',
      })
      continue
    }

    const titleMatch = trimmed.match(/^Title\d+=(.+)/)
    if (titleMatch && currentEntry !== null && tracks[currentEntry]) {
      tracks[currentEntry].title = titleMatch[1].trim()
      continue
    }

    const lengthMatch = trimmed.match(/^Length\d+=(-?\d+)/)
    if (lengthMatch && currentEntry !== null && tracks[currentEntry]) {
      tracks[currentEntry].duration = Math.max(0, parseInt(lengthMatch[1]))
    }
  }

  return tracks
}

function resolvePath(base: string, rel: string): string {
  if (rel.startsWith('/') || rel.match(/^[A-Za-z]:\\/)) return rel
  const baseDir = base.substring(0, base.lastIndexOf('/'))
  const normalized = rel.replace(/\\/g, '/')
  const segments = [...baseDir.split('/').filter(Boolean), ...normalized.split('/').filter(Boolean)]
  const resolved: string[] = []
  for (const seg of segments) {
    if (seg === '..') resolved.pop()
    else if (seg !== '.') resolved.push(seg)
  }
  return resolved.join('/')
}

export function generateM3U(tracks: Track[]): string {
  const lines = ['#EXTM3U']
  for (const t of tracks) {
    lines.push(`#EXTINF:${Math.floor(t.duration)},${t.artist} - ${t.title}`)
    lines.push(t.url || '')
  }
  return lines.join('\n')
}
