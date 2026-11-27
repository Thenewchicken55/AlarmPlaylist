# Testing

## Commands

```bash
npm run test        # Vitest, jsdom, fake-indexeddb (src/test/**)
npm run test:watch  # same in watch mode
npm run test:e2e    # Playwright (Chromium); builds and serves the app on a strict :4175
npx playwright install chromium  # once per machine, if browsers are missing
npm run lint        # ESLint
npm run format:check
npm run build       # tsc -b (type-check) + vite build
```

CI runs lint → format:check → build → test on every push/PR to `master`.

**Environment notes.** Use a working Node 22+ (this repo is set up with `mise`; `mise exec node -- …`
works if the system `node` is misconfigured). On a heavily loaded machine the 5 s per-test timeout can
trip on unrelated component tests — re-run the single file before assuming a regression
(`npx vitest run src/test/components.Input.test.tsx`).

## Inventory (26 files, 222 tests)

| File                                                                                                 | Covers                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integration.playback.test.tsx`                                                                      | The whole playback chain for real: one engine instance, stored format reaches Howler, engine position drives the page progress bar, a bar click moves the engine, `onEnd` rewinds before advancing, play works after the queue ended         |
| `e2e/playback.spec.ts`                                                                               | Real Chromium, real Howler: import a generated WAV, play it, watch progress advance, click-to-seek, finish + replay, and replay after a page reload (stored blob re-resolution)                                                              |
| `components.AlarmAlertOverlay.test.tsx`                                                              | Pick is stable across the 1 Hz clock, specific track wins, plays once, starts when the playlist loads late, beeps with no playlist / empty playlist, passes the stored format for blob tracks, applies volume/fade, dismiss/snooze lifecycle |
| `components.AudioPlayer.test.tsx`                                                                    | Format hint and source reach Howler; `onEnd` rewinds before advancing; duration from `onLoad`; skip on `onLoadError` (and not for a track that is no longer current)                                                                         |
| `components.ProgressBar.test.tsx`                                                                    | Click maps position to percent, clicks outside the bar clamp, arrow keys step 5 s, Home/End jump, no seeking while duration is unknown                                                                                                       |
| `components.PlaybackProvider.test.tsx`                                                               | Pages rendered below the provider receive the real `seek` (not the context no-op)                                                                                                                                                            |
| `components.TrackList.test.tsx`                                                                      | Empty state, durations/count, play with queue index, pause affordance for the active row, remove, file-input handoff                                                                                                                         |
| `components.PlaylistCard.test.tsx`                                                                   | Summary text, open by click/Enter/Space, M3U export (and disabled when empty), delete menu                                                                                                                                                   |
| `components.AlarmCard.test.tsx`                                                                      | Time/name/repeat labels, unnamed alarms labelled by time, toggle/edit/delete                                                                                                                                                                 |
| `components.Button.test.tsx`, `components.Input.test.tsx`, `components.Modal.test.tsx`               | UI primitives: labels, `aria-pressed`, modal open/close, focus handling                                                                                                                                                                      |
| `hooks.useTrackPlayback.test.tsx`                                                                    | Stored track → URL + format, plain URL format inference, missing audio is skipped/stopped, local and YouTube seek, YouTube play/pause/volume/end/error, progress keeps polling, stall watchdog                                               |
| `hooks.useKeyboardShortcuts.test.tsx`                                                                | Space toggles, arrows skip/seek tracks, volume clamping, mute/restore, form fields are ignored                                                                                                                                               |
| `hooks.useTheme.test.tsx`                                                                            | Dark/light classes and the system preference                                                                                                                                                                                                 |
| `db.audioStorage.test.ts`                                                                            | `getAudioSource` format from filename (filename wins over MIME), missing file, blob URL caching/revoking/deletion, storage totals                                                                                                            |
| `services.player.test.ts`                                                                            | Format hint reaches Howler, extension inference, source replacement, seek/progress/volume/fade/unload                                                                                                                                        |
| `services.youtubePlayer.test.ts`                                                                     | Init once / script failure, load and buffering state, ENDED, error-code mapping, 15 s timeout, seek/volume/progress, fade, unload                                                                                                            |
| `services.youtube.test.ts`                                                                           | URL parsing (all prefixes), keyless pagination/fallback/progress, 404 → "does not exist/Unlisted", all-hosts-down, partial imports, API key storage, API pagination/durations/quota/404/partial                                              |
| `stores.playerStore.test.ts`                                                                         | Queue start, next/prev boundaries, repeat none/all/one, shuffle, stop, volume clamping, pause/resume                                                                                                                                         |
| `stores.playlistStore.test.ts`                                                                       | CRUD persistence, local import (title/blobId/duration, bad file skipped), add/remove (blob cleanup), reorder, YouTube refresh merge that keeps local tracks                                                                                  |
| `services.alarmScheduler.test.ts`                                                                    | Next-fire calculation, rescheduling, missed alarms, snooze-adjacent behaviour                                                                                                                                                                |
| `stores.alarmStore.test.ts`                                                                          | CRUD through Dexie                                                                                                                                                                                                                           |
| `utils.audio.test.ts`, `utils.time.test.ts`, `utils.playlistParser.test.ts`, `utils.storage.test.ts` | Pure helpers, including MIME/extension edge cases, duration decoding, next-fire boundaries, path resolution and M3U round-trip                                                                                                               |
| `e2e/app.spec.ts`                                                                                    | Navigation smoke tests                                                                                                                                                                                                                       |

## What is not covered

- **YouTube network behaviour.** The IFrame service is unit-tested against a fake `YT.Player`; real
  embedding, playback and CORS are manual.
- **Alarm firing end to end in a browser** (notification, wake lock, audible output). The scheduler and
  the overlay are unit-tested, and the e2e playback path exercises the same Howler wiring.
- **Service worker / PWA offline behaviour**, and anything Tauri.
- Playwright covers Chromium only and runs against the built app (`:4175`, `--strictPort`), not the
  dev server. The strict port is deliberate: reusing an unrelated server on 4173 once made the suite
  test a different app.

## Manual verification recipes

### Import and play a local file without touching the filesystem

Run `npm run dev`, open the app, create a local playlist, then in DevTools generate a valid WAV and
hand it to the file input:

```js
function makeWav(seconds = 2, sr = 8000) {
  const n = Math.floor(sr * seconds)
  const buffer = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buffer)
  const w = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  w(0, 'RIFF')
  view.setUint32(4, 36 + n * 2, true)
  w(8, 'WAVE')
  w(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  w(36, 'data')
  view.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, Math.sin((2 * Math.PI * 440 * i) / sr) * 0.2 * 32767, true)
  return new File([buffer], 'tone.wav', { type: 'audio/wav' })
}

const dt = new DataTransfer()
dt.items.add(makeWav())
const input = [...document.querySelectorAll('input[type=file]')].find((i) => i.accept === 'audio/*')
input.files = dt.files
input.dispatchEvent(new Event('change', { bubbles: true }))
```

Then press the row's play button and check what the engine thinks:

```js
window.Howler._howls.map((h) => ({
  src: String(h._src).slice(0, 32),
  format: h._format, // must be ['wav'] — empty/undefined means the bug is back
  state: h._state,
  playing: h.playing(),
  seek: +h.seek().toFixed(2),
  duration: h.duration(),
}))
```

Expected: `playing: true`, `seek` climbing, and the page's slider `aria-valuetext` (read
`document.querySelector('[role="slider"]').getAttribute('aria-valuetext')`) reporting the same
position. Both must move together — the historical bug was `seek` advancing while the UI stayed at
`0:00`.

### Background-tab and replay checks

- Hide the tab (switch away) while a local track plays: progress must keep advancing. It did not when
  progress used `requestAnimationFrame`.
- Let a short clip finish, then press play: it must restart from the beginning. Before the fix, Howler
  re-emitted `end` immediately because `seek >= duration`.

### YouTube imports

Import a **public** playlist. If every instance fails, re-check the table in
[known-issues](known-issues.md#keyless-youtube-imports-depend-on-a-decaying-invidious-fleet) before
changing code — a private playlist looks identical from the client's point of view.

### Preview/browser caveat

In the Desktop preview panel the page can report `document.visibilityState === 'hidden'` even while
visible in a screenshot; `requestAnimationFrame` and throttled timers behave accordingly. Anything
timing-related that you verify there should be re-checked in a normal foreground tab.
