import { describe, it, expect, vi, afterEach } from 'vitest'
import { AUDIO_FORMATS, getAudioDuration, inferFormat, inferFormatFromMime, isAudioExtension } from '../utils/audio'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('inferFormat', () => {
  it('reads the extension from a normal URL', () => {
    expect(inferFormat('https://example.com/song.m4a')).toBe('m4a')
  })

  it('cannot infer a format from a blob URL — which is why stored files need one passed in', () => {
    expect(inferFormat('blob:http://localhost:5173/8f1c2d3e-4a5b')).toBeUndefined()
  })

  it('ignores case and query strings', () => {
    expect(inferFormat('https://example.com/SONG.MP3?token=abc')).toBe('mp3')
    expect(inferFormat('https://example.com/song.WAV')).toBe('wav')
  })

  it('rejects unknown, missing and extensionless names', () => {
    expect(inferFormat('https://example.com/song.txt')).toBeUndefined()
    expect(inferFormat('https://example.com/song')).toBeUndefined()
    expect(inferFormat('song.')).toBeUndefined()
  })

  it('supports every advertised format', () => {
    for (const format of AUDIO_FORMATS) {
      expect(inferFormat(`https://example.com/song.${format}`)).toBe(format)
    }
  })
})

describe('inferFormatFromMime', () => {
  it('maps common audio MIME types', () => {
    expect(inferFormatFromMime('audio/mpeg')).toBe('mp3')
    expect(inferFormatFromMime('audio/x-m4a')).toBe('m4a')
    expect(inferFormatFromMime('audio/ogg')).toBe('ogg')
    expect(inferFormatFromMime('audio/x-wav')).toBe('wav')
  })

  it('ignores codecs, spacing and case', () => {
    expect(inferFormatFromMime('audio/MP4; codecs="mp4a.40.2"')).toBe('m4a')
    expect(inferFormatFromMime('  Audio/WAV ; codecs=1 ')).toBe('wav')
  })

  it('returns undefined for unknown or empty types', () => {
    expect(inferFormatFromMime('application/octet-stream')).toBeUndefined()
    expect(inferFormatFromMime('')).toBeUndefined()
    expect(inferFormatFromMime(undefined)).toBeUndefined()
  })
})

describe('isAudioExtension', () => {
  it('accepts extensions with or without a dot, in any case', () => {
    expect(isAudioExtension('.mp3')).toBe(true)
    expect(isAudioExtension('MP3')).toBe(true)
    expect(isAudioExtension('.FLAC')).toBe(true)
  })

  it('rejects non-audio extensions', () => {
    expect(isAudioExtension('.txt')).toBe(false)
    expect(isAudioExtension('')).toBe(false)
  })
})

describe('getAudioDuration', () => {
  class FakeAudio {
    static last: FakeAudio | null = null
    src = ''
    duration = 7
    private listeners = new Map<string, Array<() => void>>()

    constructor() {
      FakeAudio.last = this
    }

    addEventListener(type: string, callback: () => void) {
      const list = this.listeners.get(type) ?? []
      list.push(callback)
      this.listeners.set(type, list)
    }

    emit(type: string) {
      this.listeners.get(type)?.forEach((callback) => callback())
    }
  }

  it('resolves the duration once metadata loads and revokes the URL', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:audio')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const duration = getAudioDuration(new File(['x'], 'tone.wav', { type: 'audio/wav' }))
    FakeAudio.last!.emit('loadedmetadata')

    await expect(duration).resolves.toBe(7)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio')
  })

  it('rejects and cleans up when the file cannot be decoded', async () => {
    vi.stubGlobal('Audio', FakeAudio)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:broken')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const duration = getAudioDuration(new File(['x'], 'broken.mp3', { type: 'audio/mpeg' }))
    FakeAudio.last!.emit('error')

    await expect(duration).rejects.toThrow(/Failed to load audio metadata/)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:broken')
  })
})
