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

export async function initializeDB() {
  await db.open()
}
