# Decisions

Short architecture decision records, newest first. Each entry says what was decided, what forced it,
and what it implies for future work.

---

## 2026-11-26 — Playback state is owned above the router (`PlaybackProvider`)

**Context.** `ProgressBar` used `useAudioSeek()`, but `AudioPlayer` provided that context around only
the `<ReactHowler>` element it renders — a subtree with no pages in it. Every page therefore got the
context's no-op default, so seeking silently did nothing for local and YouTube playback.

**Decision.** A new `PlaybackProvider` calls `useTrackPlayback()` once, above the router, publishes
`seek` to the whole tree and renders `AudioPlayer` with the playback object as a prop. `AudioPlayer`
became a pure renderer and no longer calls the hook.

**Consequences.** Pages and layout share one engine and one source of truth for seeking. The rule to
keep: never call `useTrackPlayback()` twice — two instances would drive two Howler elements and fight
over the store. Tests: `components.PlaybackProvider.test.tsx`, `components.ProgressBar.test.tsx`,
`components.AudioPlayer.test.tsx`.

---

## 2026-11-26 — Stored audio is played through `getAudioSource()` with an explicit format

**Context.** Local tracks are stored as blobs in IndexedDB and played from `URL.createObjectURL()`.
Howler derives the format from the URL extension, finds none on a `blob:` URL, and refuses the source
("No codec support for selected audio sources"), which silently skipped every local track and made
alarm playback of local files fall back to the beep.

**Decision.** `audioStorage.getAudioSource(id)` returns `{ url, format }`, deriving the format from the
stored original filename and falling back to the blob MIME type. Every playback path must pass it on
(`<ReactHowler format>` / `player.load(url, events, format)`).

**Consequences.** New playback code has one mandatory entry point for stored audio. A file with neither
a usable extension nor a MIME type still plays only if a platform-specific fallback is added — better
than guessing `mp3`.

---

## 2026-11-26 — Local progress is polled, not driven by `requestAnimationFrame`

**Context.** Progress froze at `0:00` while Howler reported the track advancing: rAF does not run in
hidden tabs, and the rAF loop returned early — without rescheduling — when Howler's instance was not
ready yet, killing itself permanently.

**Decision.** Poll `howl.seek() / howl.duration()` on a 250 ms interval, and let the interval survive a
missing instance by retrying on the next tick. YouTube progress was already interval-based.

**Consequences.** Progress keeps updating with the tab in the background and self-heals after a slow
engine start. It costs 4 wake-ups per second while playing; acceptable for a single playback.

---

## 2026-11-26 — A finished Howl is rewound before advancing

**Context.** Howler treats `seek >= duration` as an immediate end, so `play()` on a finished sound
re-emits `end`; at the end of a queue that turned into `next()` → `isPlaying: false`, and pressing play
appeared to do nothing.

**Decision.** `AudioPlayer.onEnd` calls `howler.seek(0)` before `next()`.

**Consequences.** Replaying the last track restarts it. Any new engine must handle "resume after end"
explicitly rather than assuming `play()` restarts.

---

## 2026-11-26 — The alarm overlay picks its random track once per playlist

**Context.** The pick ran during render while the overlay re-renders every second for its clock, so the
displayed track changed every tick while the audio (loaded once) did not.

**Decision.** `useMemo` the pick on `[playlist, alarm.specificTrackId]`, start playback when the pick
exists, and play the Web Audio beep when there is nothing to play.

**Consequences.** An alarm's song is fixed for the duration of that alarm. Re-firing (snooze/second
occurrence) makes a fresh pick, which is intended.

---

## 2026-11-26 — Alarm names are optional (stored as `''`)

**Context.** Requiring a name blocked saving an alarm for a feature that does not need one.

**Decision.** Keep `Alarm.name: string` and store an empty string; every display site falls back to the
scheduled time (card, overlay, notification body, aria labels).

**Consequences.** No schema migration, and older data keeps working. If the type ever becomes
`name?: string`, all fallbacks already tolerate absence.

---

## 2026-11-26 — Vercel config returns in services mode, with a single public service

**Context.** `7a199eb` (2026-08-28) removed `vercel.json` while adding the Tauri desktop build, on the
grounds that the file was a leftover from the GitHub Pages migration. Web deployment is wanted again.

**Decision.** `vercel.json` declares one service, `app` (`root: "."`, `framework: "vite"`), public on
every path. The SPA fallback (`/(.*)` → `/index.html`) is scoped to the service because services mode
only accepts service destinations at the top level.

**Consequences / rejected alternatives.**

- **`src-tauri` as a `runtime: "rust"` service** — rejected: a Tauri app opens a native window over
  `dist/`; it serves no HTTP, so no rewrite could reach it and the build target is a desktop bundle.
- **Service bindings** — none: bindings inject a URL into server-side code, and all calls here are made
  by the browser (YouTube/Invidious). A binding would be dead configuration.
- **Adding an Invidious proxy service** — would fix CORS and the dead-instance problem, but introduces a
  backend to an otherwise serverless app. Not done; see [todos](todos.md#2-decide-the-future-of-keyless-imports).

---

## 2026-08-28 — Desktop build via Tauri; web-only assumptions dropped

**Context.** The browser cannot guarantee alarms (tab must stay open, background throttling, mobile
suspension), so the app is also shipped as a native desktop app.

**Decision.** `src-tauri` packages the existing `dist/` in the OS webview; no Electron, no duplicated
frontend. `vercel.json` was removed in the same commit.

**Consequences.** Two release targets (GitHub releases for installers, Vercel for the web build) and two
environments to keep working. Desktop-only APIs (Rust scheduler, native notifications) are _not_ used
yet — the webview still runs the same browser-bound alarm code.

---

## Standing decisions

- **No backend, no accounts.** State is local (IndexedDB, localStorage). Features that need a server
  (real background alarms via Web Push, private playlist access) are product decisions first.
- **Dexie over raw IDB**, two databases: app data and audio blobs kept apart so audio can be cleared or
  re-imported independently.
- **zustand over React context** for state shared between routes; engines are singletons subscribed to
  from one hook each.
- **Keyless imports are best-effort.** A user-supplied YouTube Data API key is the reliable path for
  large or stubborn playlists; public Invidious instances are a convenience that can disappear at any
  time.
