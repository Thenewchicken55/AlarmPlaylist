import { useEffect } from 'react'
import { useAlarmStore } from '../stores/alarmStore'
import { alarmScheduler } from '../services/alarmScheduler'

export function useDSTRecalc() {
  const alarms = useAlarmStore((s) => s.alarms)

  useEffect(() => {
    function recalc() {
      alarmScheduler.rescheduleAll(alarms)
    }

    window.addEventListener('timezonechange', recalc)
    const interval = setInterval(recalc, 60 * 60 * 1000)

    return () => {
      window.removeEventListener('timezonechange', recalc)
      clearInterval(interval)
    }
  }, [alarms])
}
