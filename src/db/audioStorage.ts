import { nanoid } from 'nanoid'
import Dexie, { type EntityTable } from 'dexie'
import { inferFormat, inferFormatFromMime, type AudioFormat } from '../utils/audio'

interface StoredAudio {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: number
  data: Blob
}

const audioDb = new Dexie('AlarmPlaylistAudio') as Dexie & {
  files: EntityTable<StoredAudio, 'id'>
}

audioDb.version(1).stores({
  files: 'id, name, size, uploadedAt',
})

const blobUrlCache = new Map<string, string>()

export async function storeAudioFile(file: File): Promise<string> {
  const id = nanoid()
  await audioDb.files.put({ id, name: file.name, size: file.size, type: file.type, uploadedAt: Date.now(), data: file })
  return id
}

export async function getAudioFile(id: string): Promise<Blob | undefined> {
  const entry = await audioDb.files.get(id)
  return entry?.data
}

export async function getAudioUrl(id: string): Promise<string | undefined> {
  const blob = await getAudioFile(id)
  if (!blob) return undefined

  const existing = blobUrlCache.get(id)
  if (existing) return existing

  const url = URL.createObjectURL(blob)
  blobUrlCache.set(id, url)
  return url
}

/**
 * Resolve a stored file to something playable.
 *
 * Object URLs carry no filename, so Howler cannot infer the format from a
 * `blob:` URL and rejects the source. The original filename and MIME type are
 * kept alongside the blob, so return the format with the URL.
 */
export async function getAudioSource(id: string): Promise<{ url: string; format?: AudioFormat } | undefined> {
  const entry = await audioDb.files.get(id)
  if (!entry) return undefined

  let url = blobUrlCache.get(id)
  if (!url) {
    url = URL.createObjectURL(entry.data)
    blobUrlCache.set(id, url)
  }

  const format = inferFormat(entry.name) ?? inferFormatFromMime(entry.data.type)
  return { url, format }
}

export function revokeAudioUrl(id: string) {
  const url = blobUrlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    blobUrlCache.delete(id)
  }
}

export function revokeAllAudioUrls() {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url)
  }
  blobUrlCache.clear()
}

export async function deleteAudioFile(id: string): Promise<void> {
  revokeAudioUrl(id)
  await audioDb.files.delete(id)
}

export async function getStorageInfo(): Promise<{ totalFiles: number; totalSize: number }> {
  const files = await audioDb.files.toArray()
  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  }
}
