# AlarmPlaylist

A cross-platform alarm clock that wakes you up with music from your playlists. Set an alarm with a specific song or let it pick a random track — works with local audio files, YouTube playlists, Spotify playlists, and M3U/PLS imports.

**Demo:** [https://Thenewchicken55.github.io/AlarmPlaylist/](https://Thenewchicken55.github.io/AlarmPlaylist/)

## Preview

<!-- Add screenshot or illustration here -->

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| PWA | vite-plugin-pwa (Workbox) |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Storage | Dexie.js (IndexedDB) |
| Audio | Howler.js 2 |
| Routing | React Router 7 |
| Icons | Lucide React |
| Testing | Vitest 4 + Playwright |

## Development

```bash
npm install
npm run dev     # Start dev server with HMR
npm run build   # Production build (./dist)
npm run preview # Preview production build
npm run test    # Run tests
```

### API Credentials (optional)

YouTube and Spotify integration requires API credentials. Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `VITE_YOUTUBE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — OAuth 2.0 Web client |
| `VITE_YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — API key (for URL-based imports, no login needed) |
| `VITE_SPOTIFY_CLIENT_ID` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) |

## License

MIT

## Warning

⚠️ This project was heavily assisted by AI during its creation. Please review and test thoroughly before production use.
