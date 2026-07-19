/**
 * Fallback alarm sound using the Web Audio API.
 *
 * Used when neither the YouTube IFrame player nor a local audio file can start
 * (e.g. network failure, missing file, blocked autoplay). A simple two-tone
 * beep loop guarantees the user still gets an audible alarm.
 */

let activeCtx: AudioContext | null = null

/** Stop any currently-playing fallback tone. Safe to call when none is active. */
export function stopFallbackAlarm() {
  if (activeCtx) {
    try {
      activeCtx.close()
    } catch {
      /* ignore */
    }
    activeCtx = null
  }
}

/** Start the fallback alarm tone. Stops any previous instance first. */
export function playFallbackAlarm() {
  stopFallbackAlarm()

  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    activeCtx = ctx

    const master = ctx.createGain()
    master.connect(ctx.destination)
    master.gain.setValueAtTime(0.0001, ctx.currentTime)
    master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.1)

    const beep = (freq: number, start: number, len: number) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(g)
      g.connect(master)
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + len)
      osc.start(start)
      osc.stop(start + len + 0.05)
    }

    // ~10s of alternating two-tone beeps.
    for (let i = 0; i < 20; i++) {
      beep(i % 2 === 0 ? 880 : 660, ctx.currentTime + i * 0.5, 0.3)
    }
  } catch {
    activeCtx = null
  }
}
