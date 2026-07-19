import { calculateNextFire } from '../utils/time'
import type { Alarm } from '../types'

type AlarmCallback = (alarm: Alarm) => void

class AlarmScheduler {
  private scheduled = new Map<string, ReturnType<typeof setTimeout>>()
  private nextFireTime = new Map<string, number>()
  private callback: AlarmCallback | null = null

  onAlarmFire(callback: AlarmCallback) {
    this.callback = callback
  }

  rescheduleAll(alarms: Alarm[]) {
    const seen = new Set<string>()
    for (const alarm of alarms) {
      seen.add(alarm.id)
      if (!alarm.enabled) {
        this.clearAlarm(alarm.id)
        continue
      }
      const nextFire = calculateNextFire(alarm.hour, alarm.minute, alarm.days)
      const next = nextFire.getTime()
      const current = this.nextFireTime.get(alarm.id)
      // Only tear down + reschedule when the next-fire time actually moved.
      // This prevents clobbering in-flight timers when the `alarms` array
      // reference changes for unrelated reasons (e.g. an unrelated alarm was
      // toggled, or the hourly DST poll fired).
      if (current !== next) {
        this.scheduleOneAt(alarm, nextFire)
      }
    }
    // Drop timers for alarms that no longer exist.
    for (const id of [...this.scheduled.keys()]) {
      if (!seen.has(id)) this.clearAlarm(id)
    }
  }

  scheduleOne(alarm: Alarm) {
    const nextFire = calculateNextFire(alarm.hour, alarm.minute, alarm.days)
    this.scheduleOneAt(alarm, nextFire)
  }

  private scheduleOneAt(alarm: Alarm, nextFire: Date) {
    this.clearAlarm(alarm.id)

    const now = Date.now()
    const next = nextFire.getTime()
    this.nextFireTime.set(alarm.id, next)
    const delay = Math.max(0, next - now)

    const timeoutId = setTimeout(() => {
      this.nextFireTime.delete(alarm.id)
      this.callback?.(alarm)
      if (alarm.days.length > 0) {
        this.scheduleOne(alarm)
      }
    }, delay)

    this.scheduled.set(alarm.id, timeoutId)
  }

  /**
   * Fire any enabled alarm whose scheduled time has already passed.
   *
   * Browsers throttle `setTimeout` in background tabs to once per minute (and
   * suspend it entirely when the device sleeps). Call this on `visibilitychange`
   * (→ visible), `focus`, and `online` to catch alarms that should have fired
   * while the tab was throttled.
   */
  checkMissedAlarms(alarms: Alarm[]) {
    const now = Date.now()
    for (const alarm of alarms) {
      if (!alarm.enabled) continue
      const next = this.nextFireTime.get(alarm.id)
      if (next !== undefined && next <= now) {
        this.clearAlarm(alarm.id)
        this.callback?.(alarm)
        if (alarm.days.length > 0) {
          this.scheduleOne(alarm)
        }
      }
    }
  }

  clearAlarm(alarmId: string) {
    const existing = this.scheduled.get(alarmId)
    if (existing) {
      clearTimeout(existing)
      this.scheduled.delete(alarmId)
    }
    this.nextFireTime.delete(alarmId)
  }

  clearAll() {
    for (const [, id] of this.scheduled) {
      clearTimeout(id)
    }
    this.scheduled.clear()
    this.nextFireTime.clear()
  }

  getNextFireTime(alarm: Alarm): Date | null {
    if (!alarm.enabled) return null
    return calculateNextFire(alarm.hour, alarm.minute, alarm.days)
  }
}

export const alarmScheduler = new AlarmScheduler()
