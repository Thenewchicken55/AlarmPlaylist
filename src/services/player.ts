import { Howl } from 'howler'

type AudioEvents = {
  onEnd?: () => void
  onLoad?: () => void
  onLoadError?: (error: unknown) => void
  onPlayError?: (error: unknown) => void
}

function inferFormat(url: string): string | undefined {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  if (!ext) {
    if (url.startsWith('blob:')) return undefined
    return undefined
  }
  const map: Record<string, string> = {
    mp3: 'mp3', wav: 'wav', ogg: 'ogg', flac: 'flac',
    m4a: 'm4a', aac: 'aac', opus: 'opus', wma: 'wma',
    webm: 'webm',
  }
  return map[ext]
}

class AudioPlayerService {
  private howl: Howl | null = null
  private url: string | null = null
  private events: AudioEvents = {}

  load(url: string, events?: AudioEvents) {
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
