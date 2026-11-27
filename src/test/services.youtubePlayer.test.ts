import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { youtubePlayer } from '../services/youtubePlayer'

interface FakeConfig {
  events: {
    onReady?: (event: { target: FakePlayer }) => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

const PLAYER_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 }

class FakePlayer {
  static created = 0
  config: FakeConfig
  state = -1
  currentTime = 0
  durationValue = 100
  volumeValue = 100
  muted = false
  videoId: string | null = null
  destroyed = false
  seekCalls: Array<[number, boolean]> = []

  constructor(_elementId: string, config: FakeConfig) {
    FakePlayer.created += 1
    this.config = config
  }

  loadVideoById(id: string) {
    this.videoId = id
  }
  playVideo() {
    this.state = PLAYER_STATE.PLAYING
  }
  pauseVideo() {
    this.state = PLAYER_STATE.PAUSED
  }
  stopVideo() {
    this.state = PLAYER_STATE.CUED
  }
  seekTo(seconds: number, allowSeekAhead: boolean) {
    this.seekCalls.push([seconds, allowSeekAhead])
    this.currentTime = seconds
  }
  setVolume(v: number) {
    this.volumeValue = v
  }
  mute() {
    this.muted = true
  }
  unMute() {
    this.muted = false
  }
  isMuted() {
    return this.muted
  }
  getCurrentTime() {
    return this.currentTime
  }
  getDuration() {
    return this.durationValue
  }
  getPlayerState() {
    return this.state
  }
  destroy() {
    this.destroyed = true
  }
}

let instances: FakePlayer[] = []
let player: FakePlayer

const latest = () => instances[instances.length - 1]

function removeYT() {
  delete (window as unknown as { YT?: unknown }).YT
}

function installYT() {
  class TrackedPlayer extends FakePlayer {
    constructor(elementId: string, config: FakeConfig) {
      super(elementId, config)
      instances.push(this)
    }
  }
  ;(window as unknown as { YT: unknown }).YT = { Player: TrackedPlayer, PlayerState: PLAYER_STATE }
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  return promise.then(
    () => {
      throw new Error('expected a rejection')
    },
    (err: Error) => err,
  )
}

async function init() {
  const ready = youtubePlayer.init('yt-host')
  player = latest()
  player.config.events.onReady?.({ target: player })
  await ready
  return player
}

beforeEach(() => {
  instances = []
  FakePlayer.created = 0
  document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').forEach((script) => script.remove())
  youtubePlayer.destroy()
  removeYT()
  installYT()
})

afterEach(() => {
  youtubePlayer.destroy()
  removeYT()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('YouTubePlayerService.init', () => {
  it('resolves once the IFrame API reports ready and creates a single player', async () => {
    await init()
    await youtubePlayer.init('yt-host')

    expect(instances).toHaveLength(1)
    expect(FakePlayer.created).toBe(1)
  })

  it('rejects when the IFrame API script cannot load', async () => {
    removeYT()
    const ready = rejection(youtubePlayer.init('yt-host'))
    const script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]') as HTMLScriptElement

    script.onerror?.(new Event('error'))

    expect((await ready).message).toMatch(/Failed to load YouTube IFrame API/)
  })
})

describe('YouTubePlayerService playback', () => {
  it('loads a video and reports onLoad when it starts', async () => {
    await init()
    const onLoad = vi.fn()
    const onBuffering = vi.fn()

    const loading = youtubePlayer.load('video-1', { onLoad, onBuffering })
    expect(player.videoId).toBe('video-1')

    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading
    expect(onLoad).toHaveBeenCalledTimes(1)

    player.config.events.onStateChange?.({ data: PLAYER_STATE.PLAYING })
    expect(onBuffering).toHaveBeenLastCalledWith(false)
  })

  it('marks buffering while the video stalls', async () => {
    await init()
    const onBuffering = vi.fn()
    const loading = youtubePlayer.load('video-1', { onBuffering })
    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading

    player.config.events.onStateChange?.({ data: PLAYER_STATE.BUFFERING })
    expect(onBuffering).toHaveBeenCalledWith(true)
  })

  it('advances the queue on ENDED', async () => {
    await init()
    const onEnd = vi.fn()
    const loading = youtubePlayer.load('video-1', { onEnd })
    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading

    player.config.events.onStateChange?.({ data: PLAYER_STATE.ENDED })
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('maps embed-disabled and missing videos to onLoadError', async () => {
    await init()
    const onLoadError = vi.fn()
    const loading = rejection(youtubePlayer.load('video-1', { onLoadError }))

    player.config.events.onError?.({ data: 150 })

    expect(onLoadError).toHaveBeenCalledTimes(1)
    expect((await loading).message).toMatch(/Embedding disabled/)
  })

  it('treats other player errors as play errors', async () => {
    await init()
    const onLoadError = vi.fn()
    const onPlayError = vi.fn()
    const loading = youtubePlayer.load('video-1', { onLoadError, onPlayError })
    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading

    player.config.events.onError?.({ data: 5 })

    expect(onPlayError).toHaveBeenCalledTimes(1)
    expect(onLoadError).not.toHaveBeenCalled()
  })

  it('fails a load that never starts', async () => {
    await init()
    vi.useFakeTimers()
    const onLoadError = vi.fn()
    const loading = rejection(youtubePlayer.load('video-1', { onLoadError }))

    vi.advanceTimersByTime(15_000)

    expect((await loading).message).toMatch(/timeout/)
    expect(onLoadError).toHaveBeenCalledTimes(1)
  })

  it('seeks by percent, clamps volume and reports position', async () => {
    await init()
    const loading = youtubePlayer.load('video-1')
    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading

    player.durationValue = 200
    player.currentTime = 50

    youtubePlayer.seek(25)
    expect(player.seekCalls).toEqual([[50, true]])

    youtubePlayer.setVolume(150)
    expect(player.volumeValue).toBe(100)
    youtubePlayer.setVolume(-5)
    expect(player.volumeValue).toBe(0)

    expect(youtubePlayer.progress()).toBe(25)
    expect(youtubePlayer.duration()).toBe(200)

    player.state = PLAYER_STATE.PLAYING
    expect(youtubePlayer.isPlaying()).toBe(true)
    player.state = PLAYER_STATE.PAUSED
    expect(youtubePlayer.isPlaying()).toBe(false)
  })

  it('fades the volume over the requested duration', async () => {
    await init()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })

    youtubePlayer.fade(0, 100, 1000)
    vi.advanceTimersByTime(500)
    expect(player.volumeValue).toBeGreaterThan(0)
    expect(player.volumeValue).toBeLessThan(100)

    vi.advanceTimersByTime(600)
    expect(player.volumeValue).toBe(100)
  })

  it('stops and forgets the current video on unload', async () => {
    await init()
    const loading = youtubePlayer.load('video-1')
    player.config.events.onStateChange?.({ data: PLAYER_STATE.CUED })
    await loading

    youtubePlayer.unload()

    expect(player.videoId).toBe('video-1')
    expect(youtubePlayer.getVideoId()).toBeNull()
    expect(player.config.events.onStateChange).toBeDefined()
  })
})
