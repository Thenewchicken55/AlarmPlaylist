# Architecture

## Shape of the app

A single-page React app with no backend. Everything — playlists, audio blobs, alarms, settings — lives
in the browser (IndexedDB / localStorage). The only network traffic is YouTube/Invidious playlist
imports and the YouTube IFrame player.

```
pages/ ──► stores/ (zustand) ──► services/ (audio engines, scheduler, importers)
                 │                        │
                 └────► db/ (Dexie) ◄─────┘  utils/ are pure helpers
```

Rules that hold throughout:

- **Stores own state.** Components subscribe with selectors (`usePlayerStore((s) => s.isPlaying)`).
- **Engines are singletons** (`audioPlayer`, `youtubePlayer`, `alarmScheduler`) and are driven from
  exactly one place each — playback from `useTrackPlayback`, alarms from `useAlarmScheduler`.
- **Persistence is Dexie**, two databases: `AlarmPlaylistDB` (`playlists`, `alarms`) and
  `AlarmPlaylistAudio` (`files`: audio blobs plus their original filename and MIME type).

## Routes and global hosts

`src/App.tsx` mounts three things outside the router:

- `YouTubePlayerHost` — the invisible IFrame API player, so YouTube audio survives navigation.
- `PlaybackProvider` → `AudioPlayer` — owns the single playback engine (Howler host for local audio,
  also outside the routes so playback continues while you browse) and publishes `seek` to every page.
  `MiniPlayer` in the shell is the persistent transport bar.
- `AlarmAlertOverlay` — renders only while `alarmStore.activeAlarmId` is set.

Routes: `/alarms` (default), `/playlists`, `/playlists/:id`, `/player`, `/settings`.

## Playback pipeline

**State:** `playerStore` holds `currentTrack`, `queue`, `queueIndex`, `isPlaying`, `progress`,
`duration`, `volume`, shuffle/repeat. `playTrack`/`playQueue` set `isPlaying: true` and reset `progress`.

**Choosing the engine:** `useTrackPlayback` branches on `currentTrack.source`:

- `youtube` → `youtubePlayer.load(sourceId)` (IFrame API), progress from a 250 ms interval.
- anything else → resolve a URL and render `<ReactHowler src format playing>`. Progress from a
  250 ms interval reading `howl.seek() / howl.duration()`.

**Resolving local audio** (`src/db/audioStorage.ts`):

```
track.blobId ──► getAudioSource(id) ──► { url: blob:…, format: 'm4a' }
                                        (format from stored filename, else MIME type)
track.url ─────────────────────────────► inferFormat(url)   // legacy tracks, real URLs only
```

The explicit `format` matters: Howler rejects any source whose extension it cannot determine, and a
`blob:` URL has none. See [known-issues](known-issues.md#local-files-fail-to-load).

**Failure handling:** `skipWithWarning()` in `useTrackPlayback` counts skips inside a 2 s window,
toasts the first three, then stops the queue when the counter exceeds `queue.length`. A 30 s
no-progress watchdog does the same for stalls. When nothing is playable it stops playback and says so.

**End of track:** `AudioPlayer.onEnd` rewinds the Howl (`seek(0)`) and calls `next()`. `next()` at the
end of the queue with `repeat: 'none'` only sets `isPlaying: false` — the track stays selected. That is
why replay must rewind first.

**Seek:** `PlaybackProvider` calls `useTrackPlayback()` once, above the router, and publishes
`seek(percent)` through `AudioPlayerContext`; `AudioPlayer` receives the playback object as a prop and
only renders Howler. The provider must stay above the pages: `ProgressBar` is inside a route, so a
provider scoped to `AudioPlayer` would leave every page with the no-op default seek.

## Alarm pipeline

```
user saves alarm ──► alarmStore (Dexie) ──► useAlarmScheduler ──► alarmScheduler (setTimeout per alarm)
                                                                        │
                                       fires at due time / missed check ─┘
                                                                        ▼
                                              setActiveAlarm(id) ──► AlarmAlertOverlay
```

- `calculateNextFire(hour, minute, days)` (in `utils/time.ts`) handles repeats and the next occurrence.
- `rescheduleAll` only resets a timer when its next-fire time actually changed, so unrelated store
  updates do not clobber in-flight timers.
- `checkMissedAlarms` runs on `visibilitychange` (visible), `focus` and `online` because browsers
  throttle `setTimeout` in background tabs and suspend it while the device sleeps.
- The overlay picks its track once (memoised per playlist), pauses any normal playback, plays the
  track (with optional fade-in, volume and YouTube mute-then-unmute handling), shows a notification and
  falls back to a Web Audio two-tone beep (`utils/fallbackAlarm.ts`) when there is nothing playable or
  playback fails. Snooze reschedules `setActiveAlarm` via a timeout; snooze counts live in a
  module-level `Map` so they survive the overlay unmounting.
- `useServiceWorkerAlarmSync` registers a Periodic Background Sync (`alarm-check`, min 60 s, Android
  Chrome installed PWA only). `sw.js` posts `PERIODIC_ALARM_CHECK` back to clients, which `App.tsx`
  turns into `checkMissedAlarms` + `rescheduleAll`.

## PWA / service worker

`sw.js` is a Workbox `injectManifest` worker built by `vite-plugin-pwa`:

- precaches build assets;
- `CacheFirst` for Google Fonts;
- `StaleWhileRevalidate` (7 days, 50 entries) for any URL path containing `/api/v1/playlists/`
  (Invidious imports, so imports survive a refresh and briefly work offline);
- `periodicsync` → `PERIODIC_ALARM_CHECK`; `KEEP_AWAKE` message keeps the worker alive during alarms.

Manifest: standalone display, dark theme, SVG icons, `start_url: '/'`.

## Desktop (Tauri)

`src-tauri/` packages the same `dist/` output in a native window (Windows/macOS/Linux webview;
`beforeBuildCommand: npm run build`, `frontendDist: ../dist`, dev URL `http://localhost:5173`).
It is a desktop shell — it has no HTTP server, which is why it cannot be deployed as a web service.

## Deployment

**Web (Vercel, services mode)** — `vercel.json`:

```json
{
  "services": {
    "app": { "root": ".", "framework": "vite", "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  },
  "rewrites": [{ "source": "/(.*)", "destination": { "service": "app" } }]
}
```

The SPA fallback lives _inside_ the service because services mode only accepts service destinations at
the top level. There is exactly one service, it is public on every path, and no bindings are declared.
`src-tauri` is deliberately absent — a Tauri app is a native window, not a routable service.

During development `vite.config.ts` proxies `/api/invidious/*` to `https://inv.nadeko.net`; that proxy
is dev-only (`import.meta.env.DEV`) and is not used in production.

**Desktop releases** — `.github/workflows/release.yml` builds installers on `v*` tags via
`tauri-action` (macOS universal, Linux deb/AppImage, Windows).

**CI** — `.github/workflows/ci.yml` runs `npm ci`, `lint`, `format:check`, `build`, `test` on pushes
and PRs to `master`.
