import { Howl } from 'howler'
import { inferFormat } from '../utils/audio'
import type { Player, PlayerEvents } from './playerTypes'

class AudioPlayerService implements Player {
  private howl: Howl | null = null
  private url: string | null = null
  private events: PlayerEvents = {}

  load(url: string, events?: PlayerEvents) {
    this.unload()
    this.url = url
    this.events = events ?? {}

    const format = inferFormat(url)

    this.howl = new Howl({
      src: [url],
      format: format ? [format] : undefined,
      html5: true,
      onend: () => this.events.onEnd?.(),
      onload: () => this.events.onLoad?.(),
      onloaderror: (_id, err) => this.events.onLoadError?.(err),
      onplayerror: (_id, err) => this.events.onPlayError?.(err),
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
    this.howl?.fade(from / 100, to / 100, duration / 1000)
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
