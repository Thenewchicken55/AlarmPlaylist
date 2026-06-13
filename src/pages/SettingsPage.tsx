export default function SettingsPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-slate-800 p-4">
          <h3 className="font-medium">Theme</h3>
          <p className="mt-1 text-sm text-slate-400">Dark mode (system default)</p>
        </div>
        <div className="rounded-lg border border-slate-800 p-4">
          <h3 className="font-medium">Notifications</h3>
          <p className="mt-1 text-sm text-slate-400">Not configured</p>
        </div>
      </div>
    </div>
  )
}
