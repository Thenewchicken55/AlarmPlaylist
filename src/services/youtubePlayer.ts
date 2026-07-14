import type { Player, PlayerEvents } from './playerTypes'

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, config: YTPlayerConfig) => YTPlayer
      PlayerState: {
        UNSTARTED: -1
        ENDED: 0
        PLAYING: 1
        PAUSED: 2
        BUFFERING: 3
        CUED: 5
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayerConfig {
  height: string
  width: string
  videoId?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: { target: YTPlayer }) => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string) => void
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  destroy: () => void
}

class YouTubePlayerService implements Player {
  private player: YTPlayer | null = null
  private ready = false
  private initPromise: Promise<void> | null = null

  private videoId: string | null = null
  private _events: PlayerEvents = {}
  private loadTimeout: ReturnType<typeof setTimeout> | null = null
  private fadeInterval: ReturnType<typeof setInterval> | null = null

  private _muted = false
  private hasCalledLoad = false

  init(elementId: string): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise<void>((resolve, reject) => {
      const createPlayer = () => {
        if (!window.YT?.Player) {
          reject(new Error('YouTube IFrame API not available'))
          return
        }

        this.player = new window.YT.Player(elementId, {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ready = true
              resolve()
            },
            onStateChange: (event) => this.handleStateChange(event.data),
            onError: (event) => this.handleError(event.data),
          },
        })
      }

      if (window.YT?.Player) {
        createPlayer()
        return
      }

      if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const original = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => {
          original?.()
          createPlayer()
        }
        return
      }

      window.onYouTubeIframeAPIReady = createPlayer

      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.body.appendChild(script)
    })

    return this.initPromise
  }

  load(videoId: string, events?: YouTubeEvents): Promise<void> {
    this.unload()
    this.videoId = videoId
    this._events = events ?? {}
    this.hasCalledLoad = false

    if (!this.player || !this.ready) {
      this.fireEvent('onLoadError', new Error('YouTube player not initialized'))
      return Promise.reject(new Error('YouTube player not initialized'))
    }

    return new Promise<void>((resolve, reject) => {
      this.loadTimeout = setTimeout(() => {
        this.fireEvent('onLoadError', new Error('YouTube load timeout'))
        reject(new Error('YouTube load timeout'))
      }, 15000)

      const origOnLoad = this._events.onLoad
      this._events.onLoad = () => {
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout)
          this.loadTimeout = null
        }
        origOnLoad?.()
        resolve()
      }

      const origOnLoadError = this._events.onLoadError
      this._events.onLoadError = (err) => {
        if (this.loadTimeout) {
          clearTimeout(this.loadTimeout)
          this.loadTimeout = null
        }
        origOnLoadError?.(err)
        reject(err)
      }

      this.player!.loadVideoById(videoId)
      this.hasCalledLoad = true
    })
  }

  play() {
    this.player?.playVideo()
  }

  pause() {
    this.player?.pauseVideo()
  }

  stop() {
    this.player?.stopVideo()
  }

  seek(percent: number) {
    const dur = this.duration()
    if (dur > 0) {
      this.player?.seekTo((percent / 100) * dur, true)
    }
  }

  setVolume(v: number) {
    this.player?.setVolume(Math.max(0, Math.min(100, v)))
  }

  fade(from: number, to: number, durationMs: number) {
    if (this.fadeInterval) clearInterval(this.fadeInterval)
    const start = performance.now()

    this.fadeInterval = setInterval(() => {
      const elapsed = performance.now() - start
      const t = Math.min(1, elapsed / durationMs)
      this.setVolume(from + (to - from) * t)
      if (t >= 1) {
        clearInterval(this.fadeInterval!)
        this.fadeInterval = null
      }
    }, 50)
  }

  duration(): number {
    return this.player?.getDuration() ?? 0
  }

  progress(): number {
    if (!this.player) return 0
    const dur = this.player.getDuration()
    return dur > 0 ? (this.player.getCurrentTime() / dur) * 100 : 0
  }

  isPlaying(): boolean {
    if (!this.player) return false
    return this.player.getPlayerState() === (window.YT?.PlayerState.PLAYING ?? 1)
  }

  unload() {
    this.stop()
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout)
      this.loadTimeout = null
    }
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval)
      this.fadeInterval = null
    }
    this.videoId = null
    this._events = {}
    this.hasCalledLoad = false
  }

  destroy() {
    this.unload()
    this.player?.destroy()
    this.player = null
    this.ready = false
    this.initPromise = null
  }

  mute() {
    this.player?.mute()
    this._muted = true
  }

  unmute() {
    this.player?.unMute()
    this._muted = false
  }

  isMuted(): boolean {
    return this._muted
  }

  getVideoId(): string | null {
    return this.videoId
  }

  private handleStateChange(state: number) {
    const PS = window.YT?.PlayerState
    if (!PS) return

    switch (state) {
      case PS.ENDED:
        this.fireEvent('onEnd')
        break
      case PS.PLAYING:
        if (this.hasCalledLoad) {
          this.fireEvent('onLoad')
          this.hasCalledLoad = false
        }
        break
      case PS.CUED:
        if (this.hasCalledLoad) {
          this.fireEvent('onLoad')
          this.hasCalledLoad = false
        }
        break
    }
  }

  private handleError(code: number) {
    const msgs: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Embedding disabled',
      150: 'Embedding disabled',
    }
    const err = new Error(msgs[code] ?? `YouTube error code ${code}`)
    if (code === 2 || code === 100 || code === 101 || code === 150) {
      this.fireEvent('onLoadError', err)
    } else {
      this.fireEvent('onPlayError', err)
    }
  }

  private fireEvent(name: keyof YouTubeEvents, ...args: unknown[]) {
    ;(this._events[name] as (...args: unknown[]) => void)?.(...args)
  }
}

export const youtubePlayer = new YouTubePlayerService()
