export default function MiniPlayer() {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:bottom-0 md:left-60">
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="h-10 w-10 flex-shrink-0 rounded bg-slate-700" />
        <div className="flex-1 truncate">
          <p className="text-sm font-medium text-slate-200">No track playing</p>
          <p className="text-xs text-slate-500">Select a playlist to start</p>
        </div>
      </div>
    </div>
  )
}
