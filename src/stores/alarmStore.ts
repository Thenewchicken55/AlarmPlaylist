import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { db } from '../db/db'
import type { Alarm } from '../types'

interface CreateAlarmInput {
  name: string
  hour: number
  minute: number
  days: number[]
  playlistId: string | null
  specificTrackId: string | null
  volume: number
  fadeIn: boolean
  fadeInDuration: number
  snoozeMinutes: number
  maxSnoozes: number
}

interface AlarmState {
  alarms: Alarm[]
  activeAlarmId: string | null
  loading: boolean

  loadAlarms: () => Promise<void>
  createAlarm: (input: CreateAlarmInput) => Promise<Alarm>
  updateAlarm: (id: string, data: Partial<Alarm>) => Promise<void>
  deleteAlarm: (id: string) => Promise<void>
  toggleAlarm: (id: string) => Promise<void>

  setActiveAlarm: (id: string | null) => void
}

function generateId(): string {
  return nanoid()
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  activeAlarmId: null,
  loading: false,

  loadAlarms: async () => {
    set({ loading: true })
    try {
      const alarms = await db.alarms.toArray()
      set({ alarms, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createAlarm: async (input) => {
    const alarm: Alarm = {
      id: generateId(),
      name: input.name,
      hour: input.hour,
      minute: input.minute,
      days: input.days,
      enabled: true,
      playlistId: input.playlistId,
      specificTrackId: input.specificTrackId,
      volume: input.volume,
      fadeIn: input.fadeIn,
      fadeInDuration: input.fadeInDuration,
      snoozeMinutes: input.snoozeMinutes,
      maxSnoozes: input.maxSnoozes,
      createdAt: Date.now(),
    }
    await db.alarms.add(alarm)
    set((s) => ({ alarms: [...s.alarms, alarm] }))
    return alarm
  },

  updateAlarm: async (id, data) => {
    await db.alarms.update(id, data)
    set((s) => ({
      alarms: s.alarms.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }))
  },

  deleteAlarm: async (id) => {
    await db.alarms.delete(id)
    set((s) => ({
      alarms: s.alarms.filter((a) => a.id !== id),
      activeAlarmId: s.activeAlarmId === id ? null : s.activeAlarmId,
    }))
  },

  toggleAlarm: async (id) => {
    const alarm = get().alarms.find((a) => a.id === id)
    if (!alarm) return
    await db.alarms.update(id, { enabled: !alarm.enabled })
    set((s) => ({
      alarms: s.alarms.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      ),
    }))
  },

  setActiveAlarm: (id) => set({ activeAlarmId: id }),
}))
