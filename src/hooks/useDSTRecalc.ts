import { useEffect } from 'react'
import { useAlarmStore } from '../stores/alarmStore'
import { alarmScheduler } from '../services/alarmScheduler'

/**
 * Re-schedules alarms when the system timezone changes (e.g. DST transition
 * or the user travels). `rescheduleAll` is now idempotent — it only tears
 * down timers whose next-fire time actually moved — so this hook no longer
 * needs an hourly poll that risks clobbering in-flight alarms.
 */
export function useDSTRecalc() {
  const alarms = useAlarmStore((s) => s.alarms)

  useEffect(() => {
    function recalc() {
      alarmScheduler.rescheduleAll(alarms)
    }

    // `timezonechange` fires in modern browsers when the timezone or DST
    // offset changes. Fall back to a low-frequency poll (every 6h) for older
    // browsers that don't support it.
    window.addEventListener('timezonechange', recalc)
    const interval = setInterval(recalc, 6 * 60 * 60 * 1000)

    return () => {
      window.removeEventListener('timezonechange', recalc)
      clearInterval(interval)
    }
  }, [alarms])
}
