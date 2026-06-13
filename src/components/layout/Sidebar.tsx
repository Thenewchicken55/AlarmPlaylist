import { NavLink } from 'react-router-dom'
import { AlarmClock, Music, Play, Settings } from 'lucide-react'

const links = [
  { to: '/alarms', label: 'Alarms', icon: AlarmClock },
  { to: '/playlists', label: 'Playlists', icon: Music },
  { to: '/player', label: 'Player', icon: Play },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-slate-800 bg-slate-950 p-4">
      <h1 className="mb-8 text-xl font-bold text-indigo-400">AlarmPlaylist</h1>
      <nav className="flex flex-col gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
