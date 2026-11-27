# TODOs

Ordered by value-to-risk. Each item says why it matters and roughly how to do it; update this file
when you take one, and move finished work into [known-issues](known-issues.md) or [decisions](decisions.md).

## 1. End-to-end test for local import and playback — done

Covered by `e2e/playback.spec.ts`: it generates a WAV, drives the file input, plays it in Chromium with
real Howler, and asserts progress, click-to-seek, replay after end and playback after a page reload.
Kept here for history. If the e2e suite is ever moved to a CI job, install Chromium first
(`npx playwright install --with-deps chromium`).

## 2. Decide the future of keyless imports

The Invidious keyless path works today only because two instances happen to answer with CORS headers
(see [known-issues](known-issues.md#keyless-youtube-imports-depend-on-a-decaying-invidious-fleet)).
Every import feature is one instance outage away from breaking, and users get an unhelpful "does not
exist" for private playlists.

Options, in order of increasing scope:

1. Keep the current fallback but verify candidates (status 200 **and** `ACAO: *`) before adding them
   to `INSTANCES`, and improve the empty-result message.
2. Fetch `api.invidious.io/instances.json` at import time and try the healthy, CORS-enabled subset
   first, with the hard-coded list as a fallback.
3. Make the YouTube Data API key the supported path (better copy in Settings, explain the free quota)
   and treat keyless import as best-effort.

A server-side proxy would fix CORS permanently but breaks the "no backend" property of this app —
treat it as a product decision, not a refactor.

## 3. Stop persisting dead `blob:` URLs

`importLocalFiles` writes the object URL into `track.url`. Strip `url` for blob-backed tracks at write
time (and consider a Dexie upgrade that deletes `url` where `blobId` exists) so persisted data cannot
mislead a future playback path.

## 4. Snooze state hygiene

Snooze counts live in a module-level `Map` keyed by alarm id (`AlarmAlertOverlay`). They are deleted on
dismiss, but an alarm deleted while its overlay is open (or a snooze pending across a prune) can leave
entries behind. Consider clearing them from `alarmStore.deleteAlarm` or persisting them with the alarm.

## 5. Small polish

- `track.duration` is stamped at import from `getAudioDuration`; for tracks whose metadata was
  unavailable it is `0` and lists show `0:00`. Consider refreshing duration on first successful play.
- After a track ends, the player keeps the last progress value until the next tick; consider setting it
  to 100% (or 0) explicitly on `end`.
- `scripts/generate-screenshots.mjs` regenerates PWA screenshots referenced by `vite-plugin-pwa`;
  rerun it when the UI changes materially.
- `_format`/`format` handling: if you ever add a player besides Howler and the YouTube IFrame, keep the
  same `Player` interface (`src/services/playerTypes.ts`) and pass format hints explicitly.

## 6. Bigger questions

- **Hosting**: the web app is deployable (Vercel services mode, single `app` service) and the desktop
  app ships via GitHub releases. Decide whether both targets stay in scope; if the web target goes
  away, so should `vercel.json` again.
- **Real background alarms** would need Web Push (server) or a Tauri-side scheduler/notification —
  neither exists today, and both change the "no backend" architecture.
