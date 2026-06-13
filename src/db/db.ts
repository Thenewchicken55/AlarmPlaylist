import Dexie, { type EntityTable } from 'dexie'
import type { Playlist, Alarm } from '../types'

const db = new Dexie('AlarmPlaylistDB') as Dexie & {
  playlists: EntityTable<Playlist, 'id'>
  alarms: EntityTable<Alarm, 'id'>
}

db.version(1).stores({
  playlists: 'id, name, source, createdAt',
  alarms: 'id, name, enabled, hour, minute',
})

export { db }

export async function initializeDB(): Promise<boolean> {
  try {
    await db.open()
    return true
  } catch (err) {
    if (err instanceof Error && (err.name === 'SecurityError' || err.message?.includes('IndexedDB'))) {
      console.warn('IndexedDB unavailable (private browsing?):', err.message)
    }
    return false
  }
}
