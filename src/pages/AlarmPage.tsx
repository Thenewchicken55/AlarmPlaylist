import { useState } from 'react'
import { Plus, AlarmClock } from 'lucide-react'
import AlarmCard from '../components/alarm/AlarmCard'
import AlarmFormModal from '../components/alarm/AlarmFormModal'
import { useAlarmStore } from '../stores/alarmStore'
import { alarmScheduler } from '../services/alarmScheduler'
import { toast } from 'sonner'
import type { Alarm } from '../types'

export default function AlarmPage() {
  const alarms = useAlarmStore((s) => s.alarms)
  const toggleAlarm = useAlarmStore((s) => s.toggleAlarm)
  const deleteAlarm = useAlarmStore((s) => s.deleteAlarm)

  const [showForm, setShowForm] = useState(false)
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null)

  function handleEdit(alarm: Alarm) {
    setEditingAlarm(alarm)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingAlarm(null)
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this alarm?')) {
      await deleteAlarm(id)
      alarmScheduler.clearAlarm(id)
      toast.info('Alarm deleted')
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Alarms</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Alarm</span>
        </button>
      </div>

      {alarms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-800 p-5">
            <AlarmClock size={32} className="text-slate-500" />
          </div>
          <p className="text-lg font-medium text-slate-400">No alarms yet</p>
          <p className="mt-1 text-sm text-slate-600">Create an alarm to wake up with music</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Create Alarm
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alarms.map((alarm) => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onToggle={() => toggleAlarm(alarm.id)}
              onEdit={() => handleEdit(alarm)}
              onDelete={() => handleDelete(alarm.id)}
            />
          ))}
        </div>
      )}

      <AlarmFormModal
        key={editingAlarm?.id ?? 'new'}
        open={showForm}
        onClose={handleCloseForm}
        editAlarm={editingAlarm}
      />
    </div>
  )
}
