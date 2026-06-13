export default function PlayerPage() {
  return (
    <div className="flex items-center justify-center p-6" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
      <div className="text-center">
        <div className="mx-auto mb-6 h-48 w-48 rounded-2xl bg-slate-800" />
        <p className="text-xl font-medium text-slate-400">No track selected</p>
        <p className="mt-1 text-sm text-slate-600">Pick a song from your playlists</p>
      </div>
    </div>
  )
}
