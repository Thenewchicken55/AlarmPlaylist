import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor, Bell, Download, Info, HardDrive, Play, ExternalLink } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useUIStore } from '../stores/uiStore'
import { getStorageInfo } from '../db/audioStorage'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { formatFileSize } from '../utils/format'
import { checkStorageQuota, isPrivateBrowsing } from '../utils/storage'
import { getYouTubeApiKey, setYouTubeApiKey } from '../services/youtube'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const themeOptions = [
  { value: 'system' as const, label: 'System', icon: Monitor },
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
]

export default function SettingsPage() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const installPromptEvent = useUIStore((s) => s.installPromptEvent)

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [storageInfo, setStorageInfo] = useState({ totalFiles: 0, totalSize: 0 })
  const [apiKey, setApiKeyState] = useState(getYouTubeApiKey)

  useInstallPrompt()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifPermission('Notification' in window ? Notification.permission : 'denied')
    getStorageInfo().then(setStorageInfo)

    if (isPrivateBrowsing()) {
      toast.info('Private browsing detected — data may not persist')
    }

    checkStorageQuota().then((info) => {
      if (info && !info.ok) {
        toast.info(`Storage at ${Math.round(info.percent * 100)}% — consider clearing old files`)
      }
    })
  }, [])

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  async function handleInstall() {
    if (installPromptEvent) {
      const e = installPromptEvent as BeforeInstallPromptEvent
      e.prompt()
      const result = await e.userChoice
      if (result.outcome === 'accepted') {
        useUIStore.getState().setInstallPrompt(null)
      }
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Settings</h1>

      <div className="space-y-4 max-w-lg">
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2">
                {theme === 'dark' ? (
                  <Moon size={18} className="text-indigo-400" />
                ) : theme === 'light' ? (
                  <Sun size={18} className="text-amber-400" />
                ) : (
                  <Monitor size={18} className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Theme</p>
                <p className="text-xs text-slate-500">Choose your appearance</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  theme === value
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2">
                <Bell size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Notifications</p>
                <p className="text-xs text-slate-500">
                  {notifPermission === 'granted'
                    ? 'Enabled'
                    : notifPermission === 'denied'
                      ? 'Blocked'
                      : 'Not configured'}
                </p>
              </div>
            </div>
            {notifPermission !== 'granted' && notifPermission !== 'denied' && (
              <Button size="sm" onClick={requestNotificationPermission}>
                Enable
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 p-2">
              <Play size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-200">YouTube API Key</p>
              <p className="text-xs text-slate-500">
                Optional — enables importing large playlists (3k+ videos) that Invidious can't handle
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="AIza…"
            />
            <Button
              size="sm"
              onClick={() => {
                setYouTubeApiKey(apiKey)
                toast.success(apiKey.trim() ? 'API key saved' : 'API key removed')
              }}
            >
              Save
            </Button>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
          >
            Get a free API key <ExternalLink size={12} />
          </a>
        </Card>

        {installPromptEvent && (
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800 p-2">
                  <Download size={18} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Install App</p>
                  <p className="text-xs text-slate-500">Add to your home screen</p>
                </div>
              </div>
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 p-2">
              <HardDrive size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Storage</p>
              <p className="text-xs text-slate-500">
                {storageInfo.totalFiles} files · {formatFileSize(storageInfo.totalSize)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-800 p-2">
              <Info size={18} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">About</p>
              <p className="text-xs text-slate-500">AlarmPlaylist v0.1.0</p>
              <p className="mt-1 text-xs text-slate-600">Wake up to your favorite music. Cross-platform PWA.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
