# AlarmPlaylist — documentation

AlarmPlaylist is a browser-first alarm clock that wakes you up with music from your playlists
(local audio files, YouTube playlists, M3U/PLS imports). It runs as a PWA, and the same web build
is packaged as a native desktop app with Tauri v2.

This folder is written for the next person (or agent) picking the project up. Start with
[architecture](architecture.md) if you need to change behaviour, and [known-issues](known-issues.md)
before you conclude something "should work but doesn't".

| Doc                                | Read it when                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | You need to understand how playback, alarms, storage or deployment fit together.  |
| [conventions.md](conventions.md)   | You are about to write code, tests or commits.                                    |
| [known-issues.md](known-issues.md) | Something is broken and you want to know whether it is known, fixed, or expected. |
| [todos.md](todos.md)               | You are looking for what to do next, with context on why it matters.              |
| [testing.md](testing.md)           | You need to run, add or manually verify tests.                                    |
| [decisions.md](decisions.md)       | You want to know _why_ something is the way it is before changing it.             |

## Quick start

```bash
npm install
npm run dev        # Vite dev server with HMR (http://localhost:5173)
npm run build      # tsc -b && vite build → ./dist
npm run preview    # serve the production build
npm run test       # Vitest (unit/component)
npm run test:e2e   # Playwright: navigation + real local playback (strict :4175)
npm run lint       # ESLint
npm run format     # Prettier write (src/**)
npm run tauri:dev  # desktop app with hot reload (needs Rust toolchain)
npm run tauri:build
```

Requires **Node 22+** (`engines` in `package.json`). `mise.toml` pins `npm` and `python`;
`src-tauri` additionally needs stable Rust and, on Windows, the Visual Studio C++ build tools.

## Repository map

```
src/
  App.tsx                 routes, app-wide hooks, overlay host
  pages/                  AlarmPage, PlaylistsPage, PlaylistDetailPage, PlayerPage, SettingsPage
  components/
    layout/               AppShell (mounts AudioPlayer + MiniPlayer), Sidebar, BottomNav
    alarm/                AlarmCard, AlarmFormModal, AlarmAlertOverlay (the firing screen)
    player/               AudioPlayer, useTrackPlayback, PlaybackControls, ProgressBar, YouTube host
    playlist/             CreatePlaylistModal, TrackList, TrackRow, PlaylistCard
    ui/                   Button, Input, Modal, Toggle, TimePicker, DayPicker, Spinner, Card
  stores/                 zustand: alarmStore, playlistStore, playerStore, uiStore
  services/               alarmScheduler, player (Howler), youtubePlayer (IFrame), youtube (imports)
  db/                     Dexie: db.ts (playlists/alarms), audioStorage.ts (audio blobs)
  hooks/                  scheduler wiring, DST recalc, keyboard shortcuts, SW sync, cross-tab sync, theme
  utils/                  audio (format/MIME), time (formatTime, daysLabel, calculateNextFire), playlistParser, fallbackAlarm
  test/                   Vitest specs (see testing.md)
src-tauri/                Tauri v2 desktop shell (Rust)
sw.js                     Workbox service worker (injectManifest)
e2e/                      Playwright specs
vercel.json               Vercel services-mode config (see architecture.md § Deployment)
```

## Where to start reading

1. `src/App.tsx` — the app is four routes plus three global hosts (`AudioPlayer`, `YouTubePlayerHost`, `AlarmAlertOverlay`).
2. `src/stores/playerStore.ts` — playback state is a plain zustand store; components never call the audio engines directly.
3. `src/components/player/useTrackPlayback.ts` — the only place that talks to Howler/YouTube while playing.
4. `src/components/alarm/AlarmAlertOverlay.tsx` — what happens when an alarm fires.
5. `src/db/audioStorage.ts` + `src/db/db.ts` — all persistence lives in IndexedDB.

## Invariants worth not breaking

These were all bugs once; the fixes are load-bearing (details in [known-issues](known-issues.md)):

- Stored audio is played from a `blob:` URL, which has **no file extension** — always pass an explicit
  format to Howler (`getAudioSource()` returns one). Without it every local track "fails to load".
- The alarm overlay re-renders **once per second** for its clock: never recompute its random track
  during render (it is memoised once per playlist).
- Local progress is polled on an interval, **not** `requestAnimationFrame` (rAF is paused in hidden
  tabs and used to kill the progress loop).
- A finished Howl re-emits `end` the instant you call `play()` (Howler ends when `seek >= duration`),
  so `onEnd` rewinds the sound before advancing.
- Playback state has one owner, `PlaybackProvider`, above the router; `AudioPlayer` only renders
  Howler. Move the provider inside `AudioPlayer` and every page's seek silently becomes a no-op.
