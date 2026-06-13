import { describe, it, expect } from 'vitest'
import { parseM3U, parsePLS } from '../utils/playlistParser'

describe('parseM3U', () => {
  it('parses basic M3U', () => {
    const result = parseM3U('#EXTM3U\n#EXTINF:123,Song Artist - Song Title\nfile.mp3\n', '/music/')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'Song Title', artist: 'Song Artist' })
  })

  it('handles empty input', () => {
    expect(parseM3U('', '/')).toEqual([])
  })
})

describe('parsePLS', () => {
  it('parses basic PLS', () => {
    const pls = '[playlist]\nFile1=track.mp3\nTitle1=My Song\nLength1=180\nNumberOfEntries=1'
    const result = parsePLS(pls, '/')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'My Song' })
  })

  it('handles empty input', () => {
    expect(parsePLS('', '/')).toEqual([])
  })
})
