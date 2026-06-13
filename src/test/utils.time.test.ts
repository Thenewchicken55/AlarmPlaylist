import { describe, it, expect } from 'vitest'
import { formatTime, formatDuration, dayName, daysLabel, calculateNextFire, isAlarmExpired } from '../utils/time'

describe('formatTime', () => {
  it('formats midnight', () => expect(formatTime(0, 0)).toBe('12:00 AM'))
  it('formats noon', () => expect(formatTime(12, 0)).toBe('12:00 PM'))
  it('formats morning', () => expect(formatTime(7, 30)).toBe('7:30 AM'))
  it('formats evening', () => expect(formatTime(23, 15)).toBe('11:15 PM'))
  it('pads minutes', () => expect(formatTime(8, 5)).toBe('8:05 AM'))
})

describe('formatDuration', () => {
  it('formats seconds', () => expect(formatDuration(45)).toBe('0:45'))
  it('formats minutes', () => expect(formatDuration(125)).toBe('2:05'))
  it('formats hours', () => expect(formatDuration(3661)).toBe('61:01'))
})

describe('dayName', () => {
  it('returns Sun for 0', () => expect(dayName(0)).toBe('Sun'))
  it('returns Sat for 6', () => expect(dayName(6)).toBe('Sat'))
})

describe('daysLabel', () => {
  it('returns Every day for all 7', () => expect(daysLabel([0, 1, 2, 3, 4, 5, 6])).toBe('Every day'))
  it('returns Weekdays for Mon-Fri', () => expect(daysLabel([1, 2, 3, 4, 5])).toBe('Weekdays'))
  it('returns Weekends for Sat-Sun', () => expect(daysLabel([0, 6])).toBe('Weekends'))
  it('joins custom days', () => expect(daysLabel([1, 3, 5])).toBe('Mon, Wed, Fri'))
})

describe('calculateNextFire', () => {
  it('fires today if time not passed', () => {
    const now = new Date('2026-06-13T10:00:00')
    const next = calculateNextFire(14, 0, [], now)
    expect(next.getDate()).toBe(13)
    expect(next.getHours()).toBe(14)
  })

  it('fires tomorrow if time passed (no repeat)', () => {
    const now = new Date('2026-06-13T16:00:00')
    const next = calculateNextFire(14, 0, [], now)
    expect(next.getDate()).toBe(14)
    expect(next.getHours()).toBe(14)
  })

  it('finds next matching day for recurring', () => {
    const now = new Date('2026-06-13T10:00:00') // Saturday
    const next = calculateNextFire(8, 0, [1], now) // Monday
    expect(next.getDay()).toBe(1)
  })
})

describe('isAlarmExpired', () => {
  it('is not expired for recurring alarms', () => {
    expect(isAlarmExpired(8, 0, [1, 2, 3])).toBe(false)
  })
})
