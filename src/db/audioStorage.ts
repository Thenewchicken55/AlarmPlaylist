import { nanoid } from 'nanoid'
import Dexie, { type EntityTable } from 'dexie'

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
