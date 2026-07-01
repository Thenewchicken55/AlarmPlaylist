import { useEffect, useRef, useState } from 'react'
import { AlarmClock, X } from 'lucide-react'
import { audioPlayer } from '../../services/player'
import { useAlarmStore } from '../../stores/alarmStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { usePlayerStore } from '../../stores/playerStore'
import { getAudioUrl } from '../../db/audioStorage'
import type { Track } from '../../types'

function getRandomTrack(tracks: Track[], specificTrackId: string | null): Track | null {
  if (specificTrackId) {
    return tracks.find((t) => t.id === specificTrackId) ?? null
  }
  if (tracks.length === 0) return null
  return tracks[Math.floor(Math.random() * tracks.length)]
}

export default function AlarmAlertOverlay() {
  const activeAlarmId = useAlarmStore((s) => s.activeAlarmId)
  const setActiveAlarm = useAlarmStore((s) => s.setActiveAlarm)
  const alarms = useAlarmStore((s) => s.alarms)
  const playlists = usePlaylistStore((s) => s.playlists)
  const [snoozeCount, setSnoozeCount] = useState(0)
  const loadedRef = useRef(false)
  const wasPlayingRef = useRef(false)

  const alarm = alarms.find((a) => a.id === activeAlarmId)

  if (!activeAlarmId || !alarm) return null

  const alarmSafe = alarm

  const playlist = playlists.find((p) => p.id === alarmSafe.playlistId)
  const track = playlist
    ? getRandomTrack(playlist.tracks, alarmSafe.specificTrackId)
    : null

  const trackSafe = track

  useEffect(() => {
    if (!trackSafe || loadedRef.current) return
    loadedRef.current = true

    const alarm = alarmSafe
    const track = trackSafe

    // Pause music player
    wasPlayingRef.current = usePlayerStore.getState().isPlaying
    usePlayerStore.getState().pause()

    async function playAlarm() {
      let url: string | undefined
      if (track.blobId) {
        url = await getAudioUrl(track.blobId)
      } else {
        url = track.url
      }
      if (!url) return

      if (alarm.fadeIn) {
        audioPlayer.load(url, {
          onLoad: () => {
            audioPlayer.setVolume(0)
            audioPlayer.play()
            audioPlayer.fade(0, alarm.volume, alarm.fadeInDuration * 1000)
          },
        })
      } else {
        audioPlayer.load(url, {
          onLoad: () => {
            audioPlayer.setVolume(alarm.volume)
            audioPlayer.play()
          },
        })
      }
    }

    playAlarm()

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('AlarmPlaylist', {
        body: `⏰ ${alarm.name}`,
        tag: alarm.id,
        requireInteraction: true,
      })
    }
  }, [alarmSafe.id])

  function handleDismiss() {
    audioPlayer.stop()
    audioPlayer.unload()
    loadedRef.current = false
    if (wasPlayingRef.current) usePlayerStore.getState().resume()
    wasPlayingRef.current = false
    setActiveAlarm(null)
    setSnoozeCount(0)
  }

  function handleSnooze() {
    const alarm = alarmSafe
    if (snoozeCount >= alarm.maxSnoozes && alarm.maxSnoozes > 0) return
    audioPlayer.stop()
    audioPlayer.unload()
    loadedRef.current = false
    wasPlayingRef.current = false
    setSnoozeCount((c) => c + 1)

    setTimeout(() => {
      setActiveAlarm(alarm.id)
    }, alarm.snoozeMinutes * 60 * 1000)

    setActiveAlarm(null)
  }

  const snoozeLimit = alarm.maxSnoozes > 0 && snoozeCount >= alarm.maxSnoozes

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="text-7xl font-bold tabular-nums text-white">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        <p className="text-2xl font-medium text-slate-200">{alarm.name}</p>

        {track && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-6 py-3 backdrop-blur">
              <div className="flex gap-0.5">
                <span className="h-4 w-1 animate-pulse rounded-full bg-indigo-400" />
                <span className="h-6 w-1 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: '0.15s' }} />
                <span className="h-3 w-1 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: '0.3s' }} />
                <span className="h-5 w-1 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: '0.45s' }} />
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
            Snooze {(alarm.snoozeMinutes)}m
            {alarm.maxSnoozes > 0 && (
              <span className="text-sm text-slate-500">({snoozeCount}/{alarm.maxSnoozes})</span>
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

        {snoozeLimit && (
          <p className="text-sm text-slate-500">Snooze limit reached</p>
        )}
      </div>
    </div>
  )
}
