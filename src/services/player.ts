import { Howl } from 'howler'

type AudioEvents = {
  onEnd?: () => void
  onLoad?: () => void
  onError?: (error: unknown) => void
}

class AudioPlayerService {
  private howl: Howl | null = null
  private url: string | null = null
  private events: AudioEvents = {}

  load(url: string, events?: AudioEvents) {
    this.unload()
    this.url = url
    this.events = events ?? {}

    this.howl = new Howl({
      src: [url],
      html5: true,
      onend: () => this.events.onEnd?.(),
      onload: () => this.events.onLoad?.(),
      onloaderror: (_id, err) => this.events.onError?.(err),
      onplayerror: (_id, err) => this.events.onError?.(err),
    })
  }

  play() {
    this.howl?.play()
  }

  pause() {
    this.howl?.pause()
  }

  stop() {
    this.howl?.stop()
  }

  seek(percent: number) {
    if (this.howl) {
      const pos = (percent / 100) * this.howl.duration()
      this.howl.seek(pos)
    }
  }

  setVolume(v: number) {
    this.howl?.volume(Math.max(0, Math.min(1, v / 100)))
  }

  fade(from: number, to: number, duration: number) {
    this.howl?.fade(from / 100, to / 100, duration)
  }

  duration(): number {
    return this.howl?.duration() ?? 0
  }

  progress(): number {
    if (!this.howl) return 0
    const seek = this.howl.seek() as number
    const dur = this.howl.duration()
    return dur > 0 ? (seek / dur) * 100 : 0
  }

  isPlaying(): boolean {
    return this.howl?.playing() ?? false
  }

  unload() {
    if (this.howl) {
      this.howl.unload()
      this.howl = null
    }
    this.url = null
  }

  getUrl(): string | null {
    return this.url
  }
}

export const audioPlayer = new AudioPlayerService()
