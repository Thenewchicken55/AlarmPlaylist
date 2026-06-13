export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  const m = minute.toString().padStart(2, '0')
  return `${h}:${m} ${period}`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function dayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
}

export function dayNameLong(day: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
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
