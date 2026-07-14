export interface PlayerEvents {
  onEnd?: () => void
  onLoad?: () => void
  onLoadError?: (error: unknown) => void
  onPlayError?: (error: unknown) => void
}

/** Unified interface implemented by AudioPlayerService and YouTubePlayerService. */
export interface Player {
  load(source: string, events?: PlayerEvents): Promise<void> | void
  play(): void
  pause(): void
  stop(): void
  seek(percent: number): void
  setVolume(v: number): void // 0–100
  fade?(from: number, to: number, durationMs: number): void
  duration(): number
  progress(): number // 0–100 percent
  isPlaying(): boolean
  unload(): void
}
