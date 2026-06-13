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

export async function storeAudioFile(file: File): Promise<string> {
  const id = crypto.randomUUID()
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
  return URL.createObjectURL(blob)
}

export async function deleteAudioFile(id: string): Promise<void> {
  await audioDb.files.delete(id)
}

export async function getStorageInfo(): Promise<{ totalFiles: number; totalSize: number }> {
  const files = await audioDb.files.toArray()
  return {
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  }
}
