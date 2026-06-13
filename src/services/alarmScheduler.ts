import { calculateNextFire } from '../utils/time'
import type { Alarm } from '../types'

type AlarmCallback = (alarm: Alarm) => void

class AlarmScheduler {
  private scheduled = new Map<string, ReturnType<typeof setTimeout>>()
  private callback: AlarmCallback | null = null

  onAlarmFire(callback: AlarmCallback) {
    this.callback = callback
  }

  rescheduleAll(alarms: Alarm[]) {
    this.clearAll()
    for (const alarm of alarms) {
      if (alarm.enabled) {
        this.scheduleOne(alarm)
      }
    }
  }

  scheduleOne(alarm: Alarm) {
    this.clearAlarm(alarm.id)

    const now = new Date()
    const nextFire = calculateNextFire(alarm.hour, alarm.minute, alarm.days, now)
    const delay = Math.max(0, nextFire.getTime() - now.getTime())

    const timeoutId = setTimeout(() => {
      this.callback?.(alarm)
      if (alarm.days.length > 0) {
        this.scheduleOne(alarm)
      }
    }, delay)

    this.scheduled.set(alarm.id, timeoutId)
  }

  clearAlarm(alarmId: string) {
    const existing = this.scheduled.get(alarmId)
    if (existing) {
      clearTimeout(existing)
      this.scheduled.delete(alarmId)
    }
  }

  clearAll() {
    for (const [, id] of this.scheduled) {
      clearTimeout(id)
    }
    this.scheduled.clear()
  }

  getNextFireTime(alarm: Alarm): Date | null {
    if (!alarm.enabled) return null
    return calculateNextFire(alarm.hour, alarm.minute, alarm.days)
  }
}

export const alarmScheduler = new AlarmScheduler()
