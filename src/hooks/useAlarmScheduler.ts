import { useEffect, useRef } from 'react'
import { useAlarmStore } from '../stores/alarmStore'
import { alarmScheduler } from '../services/alarmScheduler'

export function useAlarmScheduler() {
  const alarms = useAlarmStore((s) => s.alarms)
  const setActiveAlarm = useAlarmStore((s) => s.setActiveAlarm)
  const registeredRef = useRef(false)

  useEffect(() => {
    alarmScheduler.rescheduleAll(alarms)
  }, [alarms])

  useEffect(() => {
    if (!registeredRef.current) {
      alarmScheduler.onAlarmFire((alarm) => {
        setActiveAlarm(alarm.id)
      })
      registeredRef.current = true
    }
  }, [setActiveAlarm])
}
