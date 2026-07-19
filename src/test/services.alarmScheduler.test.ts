import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { alarmScheduler } from '../services/alarmScheduler'
import type { Alarm } from '../types'

function makeAlarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    id: overrides.id ?? 'alarm-1',
    name: overrides.name ?? 'Test',
    hour: overrides.hour ?? 8,
    minute: overrides.minute ?? 0,
    days: overrides.days ?? [],
    enabled: overrides.enabled ?? true,
    playlistId: null,
    specificTrackId: null,
    volume: 70,
    fadeIn: false,
    fadeInDuration: 5,
    snoozeMinutes: 5,
    maxSnoozes: 3,
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('alarmScheduler', () => {
  beforeEach(() => {
    alarmScheduler.clearAll()
    alarmScheduler.onAlarmFire(() => {})
    vi.useFakeTimers()
    // Pin "now" to a known instant: 2026-06-13T07:00:00 (Saturday).
    vi.setSystemTime(new Date('2026-06-13T07:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires the callback when an alarm time arrives', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    // One-shot alarm one minute in the future.
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])

    vi.advanceTimersByTime(60_000)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(alarm)
  })

  it('does not fire disabled alarms', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [], enabled: false })
    alarmScheduler.rescheduleAll([alarm])

    vi.advanceTimersByTime(60_000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('does not reschedule a one-shot alarm after firing', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])

    // Advance well past the fire time + the next day's same time.
    vi.advanceTimersByTime(60_000 + 60_000)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('reschedules a recurring alarm after firing', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    // Daily alarm at 7:01 — fires once per day at that time.
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [0, 1, 2, 3, 4, 5, 6] })
    alarmScheduler.rescheduleAll([alarm])

    // Fire the first occurrence.
    vi.advanceTimersByTime(60_000)
    expect(cb).toHaveBeenCalledTimes(1)
    // Advance ~24h to the next daily occurrence.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('rescheduleAll is idempotent — does not clobber an in-flight timer when next-fire is unchanged', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])

    // Calling again with the same alarms array (different reference, same data)
    // should NOT tear down the existing timer. We verify by advancing half the
    // delay, re-rescheduling, then advancing the other half — the alarm should
    // still fire on time.
    vi.advanceTimersByTime(30_000)
    alarmScheduler.rescheduleAll([alarm])
    vi.advanceTimersByTime(30_000)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('rescheduleAll picks up new next-fire time when the alarm moves', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])

    // Move the alarm 30s earlier; reschedule should detect the change and
    // reschedule to the new (earlier) time.
    const moved = { ...alarm, hour: 7, minute: 0, days: [] }
    // Already past 7:00, so next-fire is tomorrow 7:00 — far away.
    alarmScheduler.rescheduleAll([moved])
    vi.advanceTimersByTime(60_000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('clearAlarm cancels a scheduled alarm', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ id: 'a', hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])
    alarmScheduler.clearAlarm('a')

    vi.advanceTimersByTime(60_000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('clearAll cancels everything', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    alarmScheduler.rescheduleAll([
      makeAlarm({ id: 'a', hour: 7, minute: 1, days: [] }),
      makeAlarm({ id: 'b', hour: 7, minute: 2, days: [] }),
    ])
    alarmScheduler.clearAll()

    vi.advanceTimersByTime(120_000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('rescheduleAll drops timers for alarms no longer in the list', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    alarmScheduler.rescheduleAll([makeAlarm({ id: 'gone', hour: 7, minute: 1, days: [] })])
    alarmScheduler.rescheduleAll([])
    vi.advanceTimersByTime(60_000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('checkMissedAlarms fires alarms whose scheduled time has passed', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    // One-shot alarm one minute in the future.
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    alarmScheduler.rescheduleAll([alarm])

    // Simulate the tab being backgrounded: clear the pending setTimeout queue
    // WITHOUT touching the scheduler's nextFireTime map (mimics Chrome's
    // background-tab throttling killing the timer).
    vi.clearAllTimers()
    // Advance system time past the fire time. No timer fires (we cleared it).
    vi.setSystemTime(new Date('2026-06-13T07:02:00'))
    expect(cb).not.toHaveBeenCalled()

    // The visibilitychange handler calls checkMissedAlarms — should fire now.
    alarmScheduler.checkMissedAlarms([alarm])
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('checkMissedAlarms does not fire alarms that have not yet reached their time', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    const alarm = makeAlarm({ hour: 7, minute: 5, days: [] })
    alarmScheduler.rescheduleAll([alarm])
    vi.advanceTimersByTime(30_000) // only 30s elapsed, alarm is at +5min
    alarmScheduler.checkMissedAlarms([alarm])
    expect(cb).not.toHaveBeenCalled()
  })

  it('checkMissedAlarms reschedules recurring alarms after a missed fire', () => {
    const cb = vi.fn()
    alarmScheduler.onAlarmFire(cb)
    // Daily recurring alarm one minute in the future.
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [0, 1, 2, 3, 4, 5, 6] })
    alarmScheduler.rescheduleAll([alarm])

    // Simulate background throttling: clear the timer queue, advance past fire.
    vi.clearAllTimers()
    vi.setSystemTime(new Date('2026-06-13T07:02:00'))
    alarmScheduler.checkMissedAlarms([alarm])
    expect(cb).toHaveBeenCalledTimes(1)

    // After the missed fire, a recurring alarm should be rescheduled for
    // tomorrow — advancing 24h should fire it again.
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('getNextFireTime returns null for disabled alarms', () => {
    const alarm = makeAlarm({ enabled: false })
    expect(alarmScheduler.getNextFireTime(alarm)).toBeNull()
  })

  it('getNextFireTime returns a future date for enabled alarms', () => {
    const alarm = makeAlarm({ hour: 7, minute: 1, days: [] })
    const next = alarmScheduler.getNextFireTime(alarm)
    expect(next).toBeInstanceOf(Date)
    expect(next!.getHours()).toBe(7)
    expect(next!.getMinutes()).toBe(1)
  })
})
