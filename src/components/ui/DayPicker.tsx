import { dayName } from '../../utils/time'

interface DayPickerProps {
  days: number[]
  onChange: (days: number[]) => void
}

const allDays = [0, 1, 2, 3, 4, 5, 6]

export default function DayPicker({ days, onChange }: DayPickerProps) {
  function toggle(day: number) {
    if (days.includes(day)) {
      onChange(days.filter((d) => d !== day))
    } else {
      onChange([...days, day].sort())
    }
  }

  return (
    <div className="flex gap-1.5">
      {allDays.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => toggle(day)}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            days.includes(day)
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          {dayName(day)[0]}
        </button>
      ))}
    </div>
  )
}
