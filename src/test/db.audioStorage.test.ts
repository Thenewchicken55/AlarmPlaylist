import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  deleteAudioFile,
  getAudioSource,
  getAudioUrl,
  getStorageInfo,
  revokeAudioUrl,
  storeAudioFile,
} from '../db/audioStorage'

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stored-file')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

describe('getAudioSource', () => {
  it('returns a playable URL plus the format taken from the stored filename', async () => {
    const id = await storeAudioFile(new File(['audio'], '008 - Hymn.m4a', { type: 'audio/x-m4a' }))

    const source = await getAudioSource(id)

    expect(source?.url).toBe('blob:stored-file')
    expect(source?.format).toBe('m4a')
  })

  it('does not throw when neither the filename nor the stored MIME type yield a format', async () => {
    const id = await storeAudioFile(new File(['audio'], 'recording', { type: 'audio/ogg' }))

    const source = await getAudioSource(id)

    await expect(getAudioSource(id)).resolves.toBeDefined()
    // IndexedDB does not guarantee a MIME type round-trips, so this must not throw.
    expect(source?.format).toBeUndefined()
  })

  it('returns undefined for a file that is no longer stored', async () => {
    expect(await getAudioSource('missing-id')).toBeUndefined()
  })

  it('prefers the filename format over the MIME type', async () => {
    const id = await storeAudioFile(new File(['audio'], 'song.wav', { type: 'audio/mpeg' }))

    expect((await getAudioSource(id))?.format).toBe('wav')
  })
})

describe('blob URL lifecycle', () => {
  it('creates one object URL per stored file and reuses it', async () => {
    const id = await storeAudioFile(new File(['x'], 'cache.mp3', { type: 'audio/mpeg' }))
    const create = vi.mocked(URL.createObjectURL)
    create.mockClear()

    const first = await getAudioUrl(id)
    const second = await getAudioUrl(id)

    expect(create).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('creates a fresh URL after the old one is revoked', async () => {
    const id = await storeAudioFile(new File(['x'], 'revoke.mp3', { type: 'audio/mpeg' }))
    const create = vi.mocked(URL.createObjectURL)
    create.mockReturnValueOnce('blob:one').mockReturnValueOnce('blob:two')

    expect(await getAudioUrl(id)).toBe('blob:one')
    revokeAudioUrl(id)
    expect(await getAudioUrl(id)).toBe('blob:two')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one')
  })

  it('revokes the cached URL when a file is deleted', async () => {
    const id = await storeAudioFile(new File(['x'], 'delete.mp3', { type: 'audio/mpeg' }))
    const url = await getAudioUrl(id)

    await deleteAudioFile(id)

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
    expect(await getAudioSource(id)).toBeUndefined()
  })
})

describe('getStorageInfo', () => {
  it('counts files and sums their sizes', async () => {
    const before = await getStorageInfo()

    await storeAudioFile(new File(['12345'], 'a.mp3', { type: 'audio/mpeg' }))
    await storeAudioFile(new File(['12345678'], 'b.mp3', { type: 'audio/mpeg' }))

    const after = await getStorageInfo()
    expect(after.totalFiles - before.totalFiles).toBe(2)
    expect(after.totalSize - before.totalSize).toBe(13)
  })
})
