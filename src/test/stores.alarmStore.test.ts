import { describe, it, expect, beforeEach } from 'vitest'
import { useAlarmStore } from '../stores/alarmStore'

describe('alarmStore', () => {
  beforeEach(() => useAlarmStore.setState({ alarms: [] }))

  it('starts empty', () => {
    expect(useAlarmStore.getState().alarms).toEqual([])
  })

  it('creates an alarm', async () => {
    await useAlarmStore.getState().createAlarm({
      name: 'Work',
      hour: 8,
      minute: 0,
      days: [1, 2, 3, 4, 5],
      playlistId: 'pl1',
      specificTrackId: null,
      volume: 80,
      fadeIn: true,
      fadeInDuration: 10,
      snoozeMinutes: 5,
      maxSnoozes: 3,
    })
    expect(useAlarmStore.getState().alarms).toHaveLength(1)
    expect(useAlarmStore.getState().alarms[0].name).toBe('Work')
  })

  it('updates an alarm', async () => {
    await useAlarmStore.getState().createAlarm({
      name: 'Test',
      hour: 8,
      minute: 0,
      days: [],
      playlistId: 'pl1',
      specificTrackId: null,
      volume: 50,
      fadeIn: false,
      fadeInDuration: 5,
      snoozeMinutes: 5,
      maxSnoozes: 0,
    })
    const id = useAlarmStore.getState().alarms[0].id
    await useAlarmStore.getState().updateAlarm(id, { name: 'Updated' })
    expect(useAlarmStore.getState().alarms[0].name).toBe('Updated')
  })

  it('deletes an alarm', async () => {
    await useAlarmStore.getState().createAlarm({
      name: 'Test',
      hour: 8,
      minute: 0,
      days: [],
      playlistId: 'pl1',
      specificTrackId: null,
      volume: 50,
      fadeIn: false,
      fadeInDuration: 5,
      snoozeMinutes: 5,
      maxSnoozes: 0,
    })
    const id = useAlarmStore.getState().alarms[0].id
    await useAlarmStore.getState().deleteAlarm(id)
    expect(useAlarmStore.getState().alarms).toHaveLength(0)
  })

  it('toggles enabled', async () => {
    await useAlarmStore.getState().createAlarm({
      name: 'Test',
      hour: 8,
      minute: 0,
      days: [],
      playlistId: 'pl1',
      specificTrackId: null,
      volume: 50,
      fadeIn: false,
      fadeInDuration: 5,
      snoozeMinutes: 5,
      maxSnoozes: 0,
    })
    const id = useAlarmStore.getState().alarms[0].id
    await useAlarmStore.getState().toggleAlarm(id)
    expect(useAlarmStore.getState().alarms[0].enabled).toBe(false)
  })
})
