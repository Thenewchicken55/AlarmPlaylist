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

  // Browsers throttle `setTimeout` in background tabs to once per minute and
  // suspend it entirely when the device sleeps. When the tab becomes visible
  // again (or regains focus / network), check whether any alarm should have
  // fired while we were throttled.
  useEffect(() => {
    const checkMissed = () => {
      if (document.visibilityState === 'visible') {
        alarmScheduler.checkMissedAlarms(useAlarmStore.getState().alarms)
      }
    }
    const checkAlways = () => alarmScheduler.checkMissedAlarms(useAlarmStore.getState().alarms)

    document.addEventListener('visibilitychange', checkMissed)
    window.addEventListener('focus', checkAlways)
    window.addEventListener('online', checkAlways)
    return () => {
      document.removeEventListener('visibilitychange', checkMissed)
      window.removeEventListener('focus', checkAlways)
      window.removeEventListener('online', checkAlways)
    }
  }, [])

  useEffect(() => {
    if (!registeredRef.current) {
      alarmScheduler.onAlarmFire((alarm) => {
        setActiveAlarm(alarm.id)
      })
      registeredRef.current = true
    }
  }, [setActiveAlarm])
}
