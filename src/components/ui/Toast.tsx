import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'border-emerald-600 bg-emerald-900/50 text-emerald-200',
  error: 'border-red-600 bg-red-900/50 text-red-200',
  info: 'border-indigo-600 bg-indigo-900/50 text-indigo-200',
}

export default function Toast() {
  const toast = useUIStore((s) => s.toast)
  const dismissToast = useUIStore((s) => s.dismissToast)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(dismissToast, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast, dismissToast])

  if (!toast) return null

  const Icon = icons[toast.type]

  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${colors[toast.type]}`}>
        <Icon size={18} />
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={dismissToast} className="ml-2 opacity-60 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
