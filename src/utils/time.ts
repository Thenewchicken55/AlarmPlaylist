import { format, intervalToDuration } from 'date-fns'

export function formatTime(hour: number, minute: number): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return format(d, 'h:mm a')
}

export function formatDuration(seconds: number): string {
  const dur = intervalToDuration({ start: 0, end: seconds * 1000 })
  const m = (dur.minutes ?? 0).toString().padStart(2, '0')
  const s = (dur.seconds ?? 0).toString().padStart(2, '0')
  if (dur.hours && dur.hours > 0) {
    return `${dur.hours}:${m}:${s}`
  }
  return `${parseInt(m)}:${s}`
}

export function dayName(day: number): string {
  const d = new Date()
  d.setDate(d.getDate() + ((day + 7 - d.getDay()) % 7))
  return format(d, 'EEE')
}

export function dayNameLong(day: number): string {
  const d = new Date()
  d.setDate(d.getDate() + ((day + 7 - d.getDay()) % 7))
  return format(d, 'EEEE')
}

export function daysLabel(days: number[]): string {
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
  return days.map(dayName).join(', ')
}

export function calculateNextFire(hour: number, minute: number, days: number[], from: Date = new Date()): Date {
  const candidate = new Date(from)
  candidate.setHours(hour, minute, 0, 0)

  if (days.length === 0) {
    if (candidate <= from) candidate.setDate(candidate.getDate() + 1)
    return candidate
  }

  for (let i = 0; i < 8; i++) {
    const testDay = new Date(candidate)
    testDay.setDate(testDay.getDate() + i)
    if (days.includes(testDay.getDay()) && testDay > from) {
      return testDay
    }
  }

  return candidate
}

export function isAlarmExpired(hour: number, minute: number, days: number[]): boolean {
  if (days.length > 0) return false
  const now = new Date()
  const alarmTime = new Date(now)
  alarmTime.setHours(hour, minute, 0, 0)
  return alarmTime <= now
}
