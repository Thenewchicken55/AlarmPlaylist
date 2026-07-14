interface TimePickerProps {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}

export default function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12

  function setPeriod(p: 'AM' | 'PM') {
    if (p === 'AM' && hour >= 12) onChange(hour - 12, minute)
    if (p === 'PM' && hour < 12) onChange(hour + 12, minute)
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <select
        value={displayHour}
        onChange={(e) => {
          const h = parseInt(e.target.value)
          onChange(period === 'PM' ? (h % 12) + 12 : h % 12, minute)
        }}
        className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center text-2xl font-bold text-slate-100 outline-none focus:border-indigo-500"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-2xl font-bold text-slate-400">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(hour, parseInt(e.target.value))}
        className="w-20 rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center text-2xl font-bold text-slate-100 outline-none focus:border-indigo-500"
      >
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>
            {m.toString().padStart(2, '0')}
          </option>
        ))}
      </select>
      <div className="ml-1 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setPeriod('AM')}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            period === 'AM' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => setPeriod('PM')}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            period === 'PM' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          PM
        </button>
      </div>
    </div>
  )
}
