import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Toggle from '../ui/Toggle'
import TimePicker from '../ui/TimePicker'
import DayPicker from '../ui/DayPicker'
import { useAlarmStore } from '../../stores/alarmStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { useUIStore } from '../../stores/uiStore'
import type { Alarm } from '../../types'

interface AlarmFormModalProps {
  open: boolean
  onClose: () => void
  editAlarm?: Alarm | null
}

export default function AlarmFormModal({ open, onClose, editAlarm }: AlarmFormModalProps) {
  const [name, setName] = useState('')
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(0)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [specificTrackId, setSpecificTrackId] = useState<string | null>(null)
  const [volume, setVolume] = useState(70)
  const [fadeIn, setFadeIn] = useState(true)
  const [fadeInDuration] = useState(30)
  const [snoozeMinutes] = useState(5)
  const [maxSnoozes] = useState(3)
  const [loading, setLoading] = useState(false)

  const createAlarm = useAlarmStore((s) => s.createAlarm)
  const updateAlarm = useAlarmStore((s) => s.updateAlarm)
  const playlists = usePlaylistStore((s) => s.playlists)
  const showToast = useUIStore((s) => s.showToast)

  useEffect(() => {
    if (editAlarm) {
      setName(editAlarm.name)
      setHour(editAlarm.hour)
      setMinute(editAlarm.minute)
      setDays(editAlarm.days)
      setPlaylistId(editAlarm.playlistId)
      setSpecificTrackId(editAlarm.specificTrackId)
      setVolume(editAlarm.volume)
      setFadeIn(editAlarm.fadeIn)
    } else {
      setName('')
      setHour(7)
      setMinute(0)
      setDays([1, 2, 3, 4, 5])
      setPlaylistId(null)
      setSpecificTrackId(null)
      setVolume(70)
      setFadeIn(true)
    }
  }, [editAlarm, open])

  const selectedPlaylist = playlists.find((p) => p.id === playlistId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editAlarm) {
        await updateAlarm(editAlarm.id, {
          name: name.trim(),
          hour,
          minute,
          days,
          playlistId,
          specificTrackId,
          volume,
          fadeIn,
          fadeInDuration,
          snoozeMinutes,
          maxSnoozes,
        })
        showToast('Alarm updated', 'success')
      } else {
        await createAlarm({
          name: name.trim(),
          hour,
          minute,
          days,
          playlistId,
          specificTrackId,
          volume,
          fadeIn,
          fadeInDuration,
          snoozeMinutes,
          maxSnoozes,
        })
        showToast('Alarm created', 'success')
      }
      onClose()
    } catch {
      showToast('Failed to save alarm', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editAlarm ? 'Edit Alarm' : 'New Alarm'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Wake Up"
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Time</label>
          <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m) }} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Repeat</label>
          <DayPicker days={days} onChange={setDays} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">Playlist</label>
          <select
            value={playlistId ?? ''}
            onChange={(e) => {
              setPlaylistId(e.target.value || null)
              setSpecificTrackId(null)
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            <option value="">No playlist (system sound)</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.tracks.length} tracks)</option>
            ))}
          </select>
        </div>

        {selectedPlaylist && selectedPlaylist.tracks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Song</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSpecificTrackId(null)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  specificTrackId === null
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Random
              </button>
              <select
                value={specificTrackId ?? ''}
                onChange={(e) => setSpecificTrackId(e.target.value || null)}
                className="flex-[2] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              >
                <option value="">Specific track...</option>
                {selectedPlaylist.tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} - {t.artist}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300">
            Volume: {volume}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Fade in</label>
          <Toggle checked={fadeIn} onChange={setFadeIn} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || loading}>
            {loading ? 'Saving...' : editAlarm ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
