import { describe, it, expect, vi } from 'vitest'
import { formatBytes, checkStorageQuota } from '../utils/storage'

describe('formatBytes', () => {
  it('formats bytes', () => expect(formatBytes(0)).toBe('0 B'))
  it('formats KB', () => expect(formatBytes(1024)).toBe('1.0 KB'))
  it('formats MB', () => expect(formatBytes(1048576)).toBe('1.0 MB'))
  it('formats large MB', () => expect(formatBytes(1073741824)).toBe('1024.0 MB'))
})

describe('checkStorageQuota', () => {
  it('returns null when StorageManager unavailable', async () => {
    const result = await checkStorageQuota()
    expect(result).toBeNull()
  })

  it('returns quota info when API available', async () => {
    const estimate = vi.fn().mockResolvedValue({ quota: 1000000, usage: 500000 })
    Object.assign(navigator, { storage: { estimate } })
    const result = await checkStorageQuota()
    expect(result).toEqual({ ok: true, quota: 1000000, used: 500000, percent: 0.5 })
  })
})
