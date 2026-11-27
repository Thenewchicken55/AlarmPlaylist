# Known issues

Statuses: **fixed** (a test or an invariant protects it), **open** (reproduces), **expected**
(behaviour is a platform limit, documented on purpose).

## Fixed — do not regress

### Local files fail to load

_Was:_ every track imported from disk was skipped with `Skipped "…" — failed to load audio`.

_Cause:_ stored audio is played from `URL.createObjectURL()`, i.e. `blob:http://…/<uuid>`, which has no
file extension. Howler's loader derives the format from the extension and, finding none, emits
`loaderror: "No codec support for selected audio sources."` `inferFormat()` could not help for the same
reason.

_Fix:_ `getAudioSource(id)` in `src/db/audioStorage.ts` returns `{ url, format }`, taking the format
from the stored filename and falling back to the blob's MIME type
(`inferFormatFromMime`, `src/utils/audio.ts`). Both playback paths pass it on: `<ReactHowler format>`
locally and `audioPlayer.load(url, events, format)` for alarm playback.

_Invariant:_ never load a `blob:` URL into Howler without a format. Tests:
`src/test/db.audioStorage.test.ts`, `src/test/services.player.test.ts`,
`src/test/hooks.useTrackPlayback.test.tsx`, `src/test/components.AlarmAlertOverlay.test.tsx`, and
`e2e/playback.spec.ts` in a real browser.

### Player progress frozen while a local track plays

_Was:_ audio played (Howler `seek: 1.09`) while the UI stayed at `0:00`; the song could finish and the
button stayed on Play.

_Cause:_ progress was driven by `requestAnimationFrame`. rAF is paused in hidden tabs, and
`updateProgress` returned early (`if (!h) return`) **without rescheduling**, so one frame that ran
before Howler's instance existed killed the loop permanently.

_Fix:_ a 250 ms interval in `useTrackPlayback`, which retries every tick and keeps running in
background tabs. Tests: `src/test/hooks.useTrackPlayback.test.tsx` (a tick with no Howler must not kill
the loop) and `src/test/integration.playback.test.tsx` (the page slider follows the engine position).

### Pressing play after a track ended did nothing

_Was:_ at the end of a queue, `next()` sets `isPlaying: false`; pressing play then fired `end` again
immediately, so nothing played.

_Cause:_ Howler ends a sound as soon as `seek >= duration`, so `play()` on a finished howl emits `end`
synchronously → `onEnd` → `next()` → queue end → `isPlaying: false`.

_Fix:_ `AudioPlayer.onEnd` rewinds the Howl (`seek(0)`) before calling `next()`. Tests:
`src/test/components.AudioPlayer.test.tsx` (rewind happens before the advance),
`src/test/integration.playback.test.tsx` (pressing play resumes) and `e2e/playback.spec.ts` (a real
finished howl replays instead of re-ending).

### Progress bar seek did nothing

_Was:_ clicking, dragging or using the arrow keys on the player's progress bar never moved the track;
the handle snapped back on the next poll.

_Cause:_ `AudioPlayerContext` was provided **inside** `AudioPlayer`, wrapping only the `<ReactHowler>`
element (which renders no DOM). `ProgressBar` lives in a page, outside that subtree, so `useAudioSeek()`
returned the context default `seek: () => {}` — for local and YouTube playback alike.

_Fix:_ playback state is owned above the router by `PlaybackProvider`, which publishes `seek` to every
page and renders `AudioPlayer` as a pure renderer. `AudioPlayer` no longer calls `useTrackPlayback`
itself, so there is still exactly one engine instance. Tests:
`src/test/components.PlaybackProvider.test.tsx` (a page below the provider receives the real seek),
`src/test/components.ProgressBar.test.tsx` (pointer and keyboard mapping),
`src/test/integration.playback.test.tsx` (a real click reaches the engine) and `e2e/playback.spec.ts`
(click-to-seek in Chromium).

### Alarm overlay flickered through tracks

_Was:_ while an alarm was ringing, the displayed track/artist changed every second (while audio kept
playing the first pick).

_Cause:_ the random pick `getRandomTrack(...)` was computed during render, and the overlay re-renders
every second for its clock.

_Fix:_ the pick is memoised once per playlist (`useMemo` on `[playlist, alarm.specificTrackId]`), and
playback starts once the pick exists — including when the playlist store loads late. Without a pick
(no playlist / empty playlist) the Web Audio beep plays instead of silence. Tests:
`src/test/components.AlarmAlertOverlay.test.tsx`.

### Misleading playlist-import error

_Was:_ every failure said "may be too large or unindexed … add a YouTube API key".

_Cause:_ the message was hard-coded; a 404 (playlist private/missing) looked identical to an
unreachable instance.

_Fix:_ a 404 is tracked and reported as "YouTube reports this playlist does not exist … set it to
Unlisted"; the generic case no longer points at playlist size, and the 404 reason wins over the
generic "no instance" message. Tests: `src/test/services.youtube.test.ts`.

## Open

### Keyless YouTube imports depend on a decaying Invidious fleet

Public Invidious instances are mostly gone or broken; `https://api.invidious.io/instances.json`
currently reports **zero** instances with both API and CORS enabled. Measured behaviour
(2026-11-26, against a known-public playlist):

| Instance                         | Result                                                |
| -------------------------------- | ----------------------------------------------------- |
| `inv.nadeko.net`                 | 200 + `Access-Control-Allow-Origin: *` — works (kept) |
| `inv.zzls.xyz`                   | 200 + `ACAO: *` — works (kept)                        |
| `inv.vern.cc`                    | connection failure (removed from `INSTANCES`)         |
| `yewtu.be`                       | 200 but returns the SPA's HTML                        |
| `invidious.projectsegfau.lt`     | 200 with body `Invidious has shutdown`                |
| `invidious.protokolla.fi`        | CAPTCHA page                                          |
| `invidious.materialio.us`        | works, but CORS is locked to its own origin           |
| `inv.nadeko.net` search endpoint | `Endpoint disabled`                                   |

CORS matters because the fetch runs in the browser: an instance without `ACAO: *` is unusable
regardless of its API. Any new instance must be checked for both.

### Private playlists cannot be imported by any client

For a private playlist, YouTube answers an anonymous request with
`{"alertRenderer":{"type":"ERROR","text":"The playlist does not exist."}}` (same for a stale ID).
Unlisted works; private needs OAuth as the owner, which this app does not implement — a YouTube Data
API key does **not** help. The UI now says so.

### Stale `blob:` URLs are persisted with local tracks

`playlistStore.importLocalFiles` stores the object URL it created in `track.url` and writes the track
to Dexie. Those URLs are invalid after a reload. Harmless today because playback prefers `blobId`
(`getAudioSource`), but it is stale data that will bite if a track ever loses its `blobId`.

### Alarm reliability is bounded by the browser

Expected, documented in the README: alarms only fire while the tab is alive. Background tabs are
throttled to ~1 min (mitigated by `checkMissedAlarms` on `visibilitychange`/`focus`/`online`), and
mobile browsers may suspend the tab entirely. Periodic Background Sync helps on installed Android
Chrome only. Do not "fix" this by promising true background alarms in a PWA.

### The Tauri app is not deployable to Vercel

`src-tauri` builds a native window over `dist/`; it opens no port and serves no HTTP. It must not be
added to `vercel.json`, and `runtime: "rust"` there would produce a service that can never answer a
request.
