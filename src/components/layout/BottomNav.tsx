import { NavLink } from 'react-router-dom'
import { AlarmClock, Music, Play, Settings } from 'lucide-react'

const links = [
  { to: '/alarms', label: 'Alarms', icon: AlarmClock },
  { to: '/playlists', label: 'Playlists', icon: Music },
  { to: '/player', label: 'Player', icon: Play },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-slate-950 md:hidden">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
              isActive
                ? 'text-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
