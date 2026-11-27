import { describe, it, expect } from 'vitest'
import { generateM3U, parseM3U, parsePLS } from '../utils/playlistParser'

describe('parseM3U', () => {
  it('parses basic M3U', () => {
    const result = parseM3U('#EXTM3U\n#EXTINF:123,Song Artist - Song Title\nfile.mp3\n', '/music/')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ title: 'Song Title', artist: 'Song Artist' })
  })

  it('handles empty input', () => {
    expect(parseM3U('', '/')).toEqual([])
  })

  it('resolves relative paths against the playlist file', () => {
    const result = parseM3U('#EXTM3U\nsongs/a.mp3\n', '/music/list.m3u')
    expect(result[0].url).toBe('music/songs/a.mp3')
  })

  it('resolves parent-directory segments', () => {
    const result = parseM3U('../a.mp3\n', '/music/lists/list.m3u')
    expect(result[0].url).toBe('music/a.mp3')
  })

  it('keeps absolute, Windows and http paths untouched', () => {
    const result = parseM3U('/abs/a.mp3\nC:\\Music\\b.mp3\nhttps://example.com/c.mp3\n', '/music/list.m3u')
    expect(result.map((t) => t.url)).toEqual(['/abs/a.mp3', 'C:\\Music\\b.mp3', 'https://example.com/c.mp3'])
  })

  it('falls back to the filename when there is no EXTINF and clamps negative durations', () => {
    const result = parseM3U('#EXTINF:-5,Artist - Title\nmy-song.mp3\nplain.mp3\n', '/')

    expect(result[0]).toMatchObject({ title: 'Title', artist: 'Artist', duration: 0 })
    expect(result[1]).toMatchObject({ title: 'plain', artist: 'Unknown Artist' })
  })

  it('round-trips through generateM3U', () => {
    const tracks = parseM3U('#EXTM3U\n#EXTINF:123,Artist - Title\nhttps://example.com/a.mp3\n', '/')

    const exported = generateM3U(tracks)

    expect(exported).toContain('#EXTINF:123,Artist - Title')
    expect(exported).toContain('https://example.com/a.mp3')
    expect(parseM3U(exported, '/')).toHaveLength(1)
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

  it('parses multiple entries with their own titles and lengths', () => {
    const pls = [
      '[playlist]',
      'File1=https://example.com/one.mp3',
      'Title1=One',
      'Length1=10',
      'File2=two.mp3',
      'Title2=Two',
      'Length2=-3',
      'NumberOfEntries=2',
    ].join('\n')

    const result = parsePLS(pls, '/music/list.pls')

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ title: 'One', duration: 10 })
    expect(result[1]).toMatchObject({ title: 'Two', duration: 0, url: 'music/two.mp3' })
  })
})
