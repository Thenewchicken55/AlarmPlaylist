import { useEffect, useRef, useState } from 'react'
import { AlarmClock, X } from 'lucide-react'
import { audioPlayer } from '../../services/player'
import { youtubePlayer } from '../../services/youtubePlayer'
import { useAlarmStore } from '../../stores/alarmStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { usePlayerStore } from '../../stores/playerStore'
import { getAudioUrl } from '../../db/audioStorage'
import { playFallbackAlarm, stopFallbackAlarm } from '../../utils/fallbackAlarm'
import type { Track } from '../../types'

function getRandomTrack(tracks: Track[], specificTrackId: string | null): Track | null {
  if (specificTrackId) {
    return tracks.find((t) => t.id === specificTrackId) ?? null
  }
  if (tracks.length === 0) return null
  return tracks[Math.floor(Math.random() * tracks.length)]
}

function AlarmAlertContent({
  alarm,
  onClose,
}: {
  alarm: NonNullable<ReturnType<typeof useAlarmStore.getState>['alarms'][number]>
  onClose: () => void
}) {
  const playlists = usePlaylistStore((s) => s.playlists)
  const [snoozeCount, setSnoozeCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const loadedRef = useRef(false)
  const wasPlayingRef = useRef(false)
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const playlist = playlists.find((p) => p.id === alarm.playlistId)
  const track = playlist ? getRandomTrack(playlist.tracks, alarm.specificTrackId) : null

  // Keep the displayed clock ticking while the overlay is open (frozen before).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Keep the screen awake while the alarm overlay is up so the OS doesn't
  // dim/sleep and suspend audio. Re-acquire on visibility regain (wake lock
  // is released when the tab is hidden).
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        wakeLock = await navigator.wakeLock?.request('screen')
      } catch {
        /* autoplay policy / unsupported — ignore */
      }
    }
    request()
    const onVis = () => {
      if (document.visibilityState === 'visible' && !wakeLock) request()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      wakeLock?.release().catch(() => {})
      wakeLock = null
    }
  }, [])

  useEffect(() => {
    if (!track || loadedRef.current) return
    loadedRef.current = true

    wasPlayingRef.current = usePlayerStore.getState().isPlaying
    usePlayerStore.getState().pause()

    let cancelled = false

    async function playAlarm() {
      if (!track) return

      // YouTube path
      if (track.source === 'youtube' && track.sourceId) {
        try {
          // Must happen inside a user gesture (before alarm can fire, the user
          // has interacted with the page). The mute trick handles strict browsers.
          youtubePlayer.mute()
          await youtubePlayer.load(track.sourceId, {
            onLoad: () => {
              if (cancelled) return

              youtubePlayer.play()

              // Watch for actual playback start, then apply alarm volume
              const check = setInterval(() => {
                if (!youtubePlayer.isPlaying()) return
                clearInterval(check)

                youtubePlayer.unmute()

                if (alarm.fadeIn) {
                  const startVolume = Math.min(10, alarm.volume)
                  youtubePlayer.setVolume(startVolume)
                  youtubePlayer.fade(startVolume, alarm.volume, alarm.fadeInDuration * 1000)
                } else {
                  youtubePlayer.setVolume(alarm.volume)
                }
              }, 100)

              // Safety log — don't clear the interval; let it keep polling so
              // slow-starting videos (buffering >3s) still get unmute + volume/fade
              setTimeout(() => {
                if (!cancelled && !youtubePlayer.isPlaying()) {
                  console.warn('AlarmPlaylist: YouTube playback not started after 30s')
                  playFallbackAlarm()
                }
              }, 30000)
            },
            onLoadError: (err) => {
              console.error('AlarmPlaylist: YouTube load error', alarm.name, track.title, err)
              if (!cancelled) playFallbackAlarm()
            },
            onPlayError: (err) => {
              console.error('AlarmPlaylist: YouTube play error', alarm.name, track.title, err)
              if (!cancelled) playFallbackAlarm()
            },
          })
        } catch (err) {
          console.error('AlarmPlaylist: YouTube player error', err)
          if (!cancelled) playFallbackAlarm()
        }
        return
      }

      // Local path
      let url: string | undefined
      if (track.blobId) {
        url = await getAudioUrl(track.blobId)
        if (cancelled) return
      } else {
        url = track.url
      }
      if (!url) {
        console.warn('AlarmPlaylist: track has no playable URL', {
          title: track.title,
          source: track.source,
          sourceId: track.sourceId,
        })
        if (!cancelled) playFallbackAlarm()
        return
      }

      audioPlayer.load(url, {
        onLoad: () => {
          if (cancelled) return
          if (alarm.fadeIn) {
            const startVolume = Math.min(10, alarm.volume)
            audioPlayer.setVolume(startVolume)
            audioPlayer.play()
            audioPlayer.fade(startVolume, alarm.volume, alarm.fadeInDuration * 1000)
          } else {
            audioPlayer.setVolume(alarm.volume)
            audioPlayer.play()
          }
        },
        onLoadError: (err) => {
          console.error('AlarmPlaylist: failed to load audio', alarm.name, track.title, err)
          if (!cancelled) playFallbackAlarm()
        },
        onPlayError: (err) => {
          console.error('AlarmPlaylist: failed to play audio', alarm.name, track.title, err)
          if (!cancelled) playFallbackAlarm()
        },
      })
    }

    playAlarm()

    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification('AlarmPlaylist', {
        body: `⏰ ${alarm.name}`,
        tag: alarm.id,
        requireInteraction: true,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    }

    return () => {
      cancelled = true
      audioPlayer.stop()
      audioPlayer.unload()
      if (track?.source === 'youtube') {
        youtubePlayer.stop()
        youtubePlayer.unload()
      }
      stopFallbackAlarm()
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDismiss() {
    clearTimeout(snoozeTimerRef.current)
    if (track?.source === 'youtube') {
      youtubePlayer.stop()
      youtubePlayer.unload()
    } else {
      audioPlayer.stop()
      audioPlayer.unload()
    }
    stopFallbackAlarm()
    loadedRef.current = false
    if (wasPlayingRef.current) usePlayerStore.getState().resume()
    onClose()
    setSnoozeCount(0)
  }

  function handleSnooze() {
    if (snoozeCount >= alarm.maxSnoozes && alarm.maxSnoozes > 0) return
    clearTimeout(snoozeTimerRef.current)
    if (track?.source === 'youtube') {
      youtubePlayer.stop()
      youtubePlayer.unload()
    } else {
      audioPlayer.stop()
      audioPlayer.unload()
    }
    stopFallbackAlarm()
    loadedRef.current = false
    wasPlayingRef.current = false
    setSnoozeCount((c) => c + 1)

    snoozeTimerRef.current = setTimeout(
      () => {
        useAlarmStore.getState().setActiveAlarm(alarm.id)
      },
      alarm.snoozeMinutes * 60 * 1000,
    )

    onClose()
  }

  const snoozeLimit = alarm.maxSnoozes > 0 && snoozeCount >= alarm.maxSnoozes

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={`${alarm.name} alarm`}
      aria-live="assertive"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl"
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="text-7xl font-bold tabular-nums text-white">
          {new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        <p className="text-2xl font-medium text-slate-200">{alarm.name}</p>

        {track && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-6 py-3 backdrop-blur">
              <div className="flex gap-0.5">
                <span className="h-4 w-1 animate-pulse rounded-full bg-indigo-400" />
                <span
                  className="h-6 w-1 animate-pulse rounded-full bg-indigo-400"
                  style={{ animationDelay: '0.15s' }}
                />
                <span className="h-3 w-1 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: '0.3s' }} />
                <span
                  className="h-5 w-1 animate-pulse rounded-full bg-indigo-400"
                  style={{ animationDelay: '0.45s' }}
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{track.title}</p>
                <p className="text-xs text-slate-400">{track.artist}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSnooze}
            disabled={snoozeLimit}
            className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-8 py-4 text-lg font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlarmClock size={24} />
            Snooze {alarm.snoozeMinutes}m
            {alarm.maxSnoozes > 0 && (
              <span className="text-sm text-slate-500">
                ({snoozeCount}/{alarm.maxSnoozes})
              </span>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <X size={24} />
            Dismiss
          </button>
        </div>

        {snoozeLimit && <p className="text-sm text-slate-500">Snooze limit reached</p>}
      </div>
    </div>
  )
}

export default function AlarmAlertOverlay() {
  const activeAlarmId = useAlarmStore((s) => s.activeAlarmId)
  const setActiveAlarm = useAlarmStore((s) => s.setActiveAlarm)
  const alarms = useAlarmStore((s) => s.alarms)

  const alarm = alarms.find((a) => a.id === activeAlarmId)

  if (!activeAlarmId || !alarm) return null

  return <AlarmAlertContent alarm={alarm} onClose={() => setActiveAlarm(null)} />
}
