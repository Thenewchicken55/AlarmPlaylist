import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const howlOptions = vi.hoisted(() => [] as Record<string, unknown>[])
const instances = vi.hoisted(() => [] as Array<Record<string, unknown>>)

class HowlMock {
  options: Record<string, unknown>
  durationValue = 100
  seekValue = 0
  volumeValue = 1
  playingValue = false
  unloaded = false
  fadeArgs: [number, number, number] | null = null

  constructor(options: Record<string, unknown>) {
    this.options = options
    howlOptions.push(options)
    instances.push(this as unknown as Record<string, unknown>)
  }
  unload() {
    this.unloaded = true
    this.playingValue = false
  }
  play() {
    this.playingValue = true
  }
  pause() {
    this.playingValue = false
  }
  stop() {
    this.playingValue = false
  }
  volume(value?: number) {
    if (value !== undefined) this.volumeValue = value
    return this.volumeValue
  }
  fade(from: number, to: number, duration: number) {
    this.fadeArgs = [from, to, duration]
  }
  duration() {
    return this.durationValue
  }
  seek(position?: number) {
    if (position !== undefined) this.seekValue = position
    return this.seekValue
  }
  playing() {
    return this.playingValue
  }
}

vi.mock('howler', () => ({ Howl: HowlMock }))

const { audioPlayer } = await import('../services/player')

const lastOptions = () => howlOptions[howlOptions.length - 1]
const lastHowl = () => instances[instances.length - 1] as unknown as HowlMock

beforeEach(() => {
  howlOptions.length = 0
  instances.length = 0
})

afterEach(() => {
  audioPlayer.unload()
})

describe('AudioPlayerService.load', () => {
  it('passes an explicit format through to Howler (blob URLs have no extension)', () => {
    audioPlayer.load('blob:http://localhost:5173/8f1c2d3e', {}, 'm4a')

    expect(lastOptions().src).toEqual(['blob:http://localhost:5173/8f1c2d3e'])
    expect(lastOptions().format).toEqual(['m4a'])
  })

  it('still infers the format for URLs that have one', () => {
    audioPlayer.load('https://example.com/song.mp3')

    expect(lastOptions().format).toEqual(['mp3'])
  })

  it('leaves format unset when nothing can be inferred — the case that made Howler reject stored files', () => {
    audioPlayer.load('blob:http://localhost:5173/8f1c2d3e')

    expect(lastOptions().format).toBeUndefined()
  })

  it('replaces the previous sound when a new source loads', () => {
    audioPlayer.load('https://example.com/one.mp3')
    const first = lastHowl()
    audioPlayer.load('https://example.com/two.mp3')

    expect(first.unloaded).toBe(true)
    expect(lastOptions().src).toEqual(['https://example.com/two.mp3'])
  })
})

describe('AudioPlayerService controls', () => {
  beforeEach(() => {
    audioPlayer.load('https://example.com/song.mp3')
    lastHowl().durationValue = 200
  })

  it('seeks by percentage', () => {
    audioPlayer.seek(25)
    expect(lastHowl().seekValue).toBe(50)
  })

  it('reports progress and duration from the engine', () => {
    audioPlayer.seek(25)
    expect(audioPlayer.progress()).toBe(25)
    expect(audioPlayer.duration()).toBe(200)
  })

  it('clamps the volume between 0 and 1', () => {
    audioPlayer.setVolume(150)
    expect(lastHowl().volumeValue).toBe(1)
    audioPlayer.setVolume(-20)
    expect(lastHowl().volumeValue).toBe(0)
    audioPlayer.setVolume(55)
    expect(lastHowl().volumeValue).toBe(0.55)
  })

  it('converts fade percentages and milliseconds for Howler', () => {
    audioPlayer.fade(0, 100, 2000)
    expect(lastHowl().fadeArgs).toEqual([0, 1, 2])
  })

  it('reports playing state and unloads cleanly', () => {
    audioPlayer.play()
    expect(audioPlayer.isPlaying()).toBe(true)
    audioPlayer.pause()
    expect(audioPlayer.isPlaying()).toBe(false)

    audioPlayer.unload()
    expect(lastHowl().unloaded).toBe(true)
    expect(audioPlayer.duration()).toBe(0)
    expect(audioPlayer.getUrl()).toBeNull()
  })
})
