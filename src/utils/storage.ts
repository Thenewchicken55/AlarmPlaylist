const STORAGE_WARN_THRESHOLD = 0.8

export async function checkStorageQuota(): Promise<{ ok: boolean; used: number; quota: number; percent: number } | null> {
  if (!navigator.storage || !navigator.storage.estimate) return null
  try {
    const estimate = await navigator.storage.estimate()
    const used = estimate.usage ?? 0
    const quota = estimate.quota ?? 0
    const percent = quota > 0 ? used / quota : 0
    return { ok: percent < STORAGE_WARN_THRESHOLD, used, quota, percent }
  } catch {
    return null
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isPrivateBrowsing(): boolean {
  try {
    localStorage.setItem('__test', '1')
    localStorage.removeItem('__test')
    return false
  } catch {
    return true
  }
}
