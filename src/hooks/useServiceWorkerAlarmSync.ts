import { useEffect } from 'react'

interface PeriodicSyncRegistration extends ServiceWorkerRegistration {
  periodicSync: {
    register: (tag: string, options?: { minInterval?: number }) => Promise<void>
    unregister: (tag: string) => Promise<boolean>
  }
}

/**
 * Registers a periodic background sync so the service worker can wake the app
 * up to check for due alarms (Chrome Android, installed PWA only).
 *
 * The matching `periodicsync` listener in `sw.js` posts a
 * `PERIODIC_ALARM_CHECK` message back to clients, which `App.tsx` handles by
 * calling `alarmScheduler.checkMissedAlarms`.
 */
export function useServiceWorkerAlarmSync() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cancelled = false
    ;(async () => {
      try {
        const reg = (await navigator.serviceWorker.ready) as PeriodicSyncRegistration
        if (typeof reg.periodicSync?.register !== 'function') return

        // Only request if the user granted the periodic-background-sync
        // permission (otherwise the registration silently fails / throws).
        const perm = await navigator.permissions
          ?.query({ name: 'periodic-background-sync' as PermissionName })
          .catch(() => null)
        if (perm && perm.state !== 'granted') return

        if (cancelled) return
        await reg.periodicSync.register('alarm-check', { minInterval: 60_000 })
      } catch {
        /* unsupported or denied — rely on visibilitychange fallback */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
