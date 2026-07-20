# AlarmPlaylist

A cross-platform alarm clock that wakes you up with music from your playlists. Set an alarm with a specific song or let it pick a random track — works with local audio files, YouTube playlists, and M3U/PLS imports.

## Tech Stack

| Concern    | Library                                                     |
| ---------- | ----------------------------------------------------------- |
| Framework  | React 19 + TypeScript                                       |
| Build tool | Vite 8                                                      |
| PWA        | vite-plugin-pwa (custom `sw.js` via injectManifest)         |
| Styling    | Tailwind CSS 4                                              |
| State      | Zustand 5                                                   |
| Storage    | Dexie.js (IndexedDB)                                        |
| Audio      | Howler.js 2 + YouTube IFrame API + Web Audio API (fallback) |
| Routing    | React Router 7                                              |
| Icons      | Lucide React                                                |
| Testing    | Vitest 4 + Playwright                                       |

## Development

```bash
npm install
npm run dev     # Start dev server with HMR
npm run build   # Production build (./dist)
npm run preview # Preview production build
npm run test    # Run unit tests
npm run lint    # ESLint
npm run format  # Prettier write
```

### YouTube Playlists

Importing a YouTube playlist does **not** require any API keys by default — the app fetches playlist metadata from public Invidious instances.

For **large playlists** (3,000+ videos), public Invidious instances often time out or return 0 results. To reliably import these, add a free YouTube Data API v3 key in **Settings → YouTube API Key**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an API key (not OAuth)
3. Enable the YouTube Data API v3 for that key
4. Paste it in Settings

The key is stored locally in your browser (never sent anywhere except Google's API). Free quota: 10,000 units/day — enough for ~200 large playlist imports per day.

## ⚠️ Alarm Reliability Limitations

This is a **web-based** alarm clock, which means it cannot guarantee alarms will
fire in every situation. Please read these limitations before relying on it:

- **The browser tab must stay open.** Closing the tab kills the in-page
  `setTimeout`-based scheduler. There is no true background alarm without a
  native app or OS-level integration.
- **Background tabs are throttled.** Chrome throttles `setTimeout` to once per
  minute in background tabs. The app mitigates this by re-checking for missed
  alarms on `visibilitychange` / `focus` / `online`, so a backgrounded alarm
  will fire shortly after you refocus the tab.
- **Mobile devices may suspend the tab.** iOS Safari aggressively suspends
  background tabs; an alarm will not fire while the phone is locked. Keep the
  tab foregrounded, or install the app to your home screen and leave it open.
- **Installed PWA on Android Chrome** can use the Periodic Background Sync API
  to wake the app and check for due alarms (the app registers this
  automatically when supported).
- **Notifications** require the notification permission. Grant it so the alarm
  overlay can show a system notification (clicking it focuses the app).
- **Wake Lock** is requested while the alarm overlay is shown so the screen
  doesn't dim/sleep and suspend audio.

For a guaranteed-fire alarm, use a native alarm app. This project is best
suited for "the laptop is open on my desk" / "the phone is plugged in with the
app open" scenarios.

## License

MIT — see [LICENSE](./LICENSE).

## Warning

⚠️ This project was heavily assisted by AI during its creation. Please review and test thoroughly before production use.
