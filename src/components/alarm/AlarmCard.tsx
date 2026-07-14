import { Pencil, Trash2 } from 'lucide-react'
import Toggle from '../ui/Toggle'
import { formatTime, daysLabel } from '../../utils/time'
import type { Alarm } from '../../types'

interface AlarmCardProps {
  alarm: Alarm
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function AlarmCard({ alarm, onToggle, onEdit, onDelete }: AlarmCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        alarm.enabled ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900/50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-bold tabular-nums ${alarm.enabled ? 'text-slate-100' : 'text-slate-500'}`}>
              {formatTime(alarm.hour, alarm.minute)}
            </span>
            <span className="text-sm text-slate-500">{alarm.name}</span>
          </div>
          <p className={`mt-1 text-sm ${alarm.enabled ? 'text-slate-400' : 'text-slate-600'}`}>
            {daysLabel(alarm.days)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
          <Toggle checked={alarm.enabled} onChange={onToggle} />
        </div>
      </div>
    </div>
  )
}
