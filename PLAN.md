# AlarmPlaylist — Implementation Plan

> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + PWA + IndexedDB (Dexie.js) + Zustand + Howler.js
> **Target:** Desktop (Chrome, Edge, Firefox, Safari) + Mobile (Android Chrome, iOS Safari) via PWA
> **Deployment:** GitHub Pages (or Vercel/Netlify)

---

## Phase 0: Project Scaffolding

### Step 0.1 — Initialize Vite + React + TypeScript

```bash
npm create vite@latest . -- --template react-ts
```

**Files created:**
- `package.json` — dependencies, scripts
- `tsconfig.json` — TypeScript config (strict mode)
- `tsconfig.node.json` — TS config for Vite
- `vite.config.ts` — Vite configuration
- `index.html` — entry HTML
- `src/main.tsx` — React entry point
- `src/App.tsx` — root component
- `public/` — static assets directory

### Step 0.2 — Install Dependencies

```bash
npm install react-router-dom zustand dexie howler nanoid lucide-react
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom eslint prettier eslint-config-prettier vite-plugin-pwa
```

### Step 0.3 — Configure Tailwind CSS

**`vite.config.ts`:**
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...]
})
```

**`src/index.css`:**
```css
@import "tailwindcss";
```

### Step 0.4 — Configure PWA (vite-plugin-pwa)

In `vite.config.ts`, add PWA plugin:

```ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: 'AlarmPlaylist',
    short_name: 'AlarmPlaylist',
    description: 'Wake up to your favorite music',
    theme_color: '#6366f1',
    background_color: '#0f172a',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    runtimeCaching: [] // API caching rules added later
  }
})
```

### Step 0.5 — Directory Structure

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── vite-env.d.ts
├── components/         # Reusable UI components
│   ├── ui/             # Primitives (Button, Modal, Input, etc.)
│   ├── layout/         # App shell, header, nav
│   ├── playlist/       # Playlist-related components
│   ├── alarm/          # Alarm-related components
│   └── player/         # Music player components
├── pages/              # Route page components
├── stores/             # Zustand state stores
├── db/                 # Dexie.js database schema
├── hooks/              # Custom React hooks
├── services/           # Business logic (alarm scheduler, etc.)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── workers/            # Service Worker (if custom logic needed)
```

### Step 0.6 — ESLint & Prettier

Set up `eslint.config.js` with React + TypeScript rules and `.prettierrc` with consistent formatting.

### Step 0.7 — Vitest Setup

**`src/test/setup.ts`:**
```ts
import '@testing-library/jest-dom'
```

**`vite.config.ts`** test section:
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
}
```

---

## Phase 1: Data Layer

### Step 1.1 — TypeScript Types

**`src/types/index.ts`:**

```ts
export type PlaylistSource = 'local' | 'youtube' | 'spotify'

export interface Track {
  id: string
  title: string
  artist: string
  duration: number        // seconds
  url?: string            // local blob:// or streaming URL
  thumbnail?: string      // album art URL
  source: PlaylistSource
  sourceId?: string       // YouTube video ID / Spotify track ID
  blobId?: string         // IDB blob key for local files
}

export interface Playlist {
  id: string
  name: string
  source: PlaylistSource
  sourceUrl?: string
  tracks: Track[]
  color: string           // hex color for UI accent
  createdAt: number       // unix ms
}

export interface Alarm {
  id: string
  name: string
  hour: number            // 0-23
  minute: number          // 0-59
  days: number[]          // 0=Sun, 1=Mon ... 6=Sat
  enabled: boolean
  playlistId: string | null
  specificTrackId: string | null   // null = random
  volume: number          // 0-100
  fadeIn: boolean
  fadeInDuration: number  // seconds
  snoozeMinutes: number   // default 5
  maxSnoozes: number      // 0 = unlimited
  createdAt: number
}

export type Page = 'alarms' | 'playlists' | 'player' | 'settings'
```

### Step 1.2 — Dexie.js Database

**`src/db/db.ts`:**

```ts
import Dexie, { type EntityTable } from 'dexie'
import type { Playlist, Alarm } from '../types'

const db = new Dexie('AlarmPlaylistDB') as Dexie & {
  playlists: EntityTable<Playlist, 'id'>
  alarms: EntityTable<Alarm, 'id'>
}

db.version(1).stores({
  playlists: 'id, name, source, createdAt',
  alarms: 'id, name, enabled, hour, minute',
})

export { db }
```

### Step 1.3 — Zustand Stores

#### Playlist Store (`src/stores/playlistStore.ts`)

```ts
interface PlaylistState {
  playlists: Playlist[]
  selectedPlaylistId: string | null

  // Actions
  loadPlaylists: () => Promise<void>
  createPlaylist: (data: CreatePlaylistInput) => Promise<Playlist>
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>

  // Track management
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>
}
```

#### Alarm Store (`src/stores/alarmStore.ts`)

```ts
interface AlarmState {
  alarms: Alarm[]
  activeAlarmId: string | null

  loadAlarms: () => Promise<void>
  createAlarm: (data: CreateAlarmInput) => Promise<Alarm>
  updateAlarm: (id: string, data: Partial<Alarm>) => Promise<void>
  deleteAlarm: (id: string) => Promise<void>
  toggleAlarm: (id: string) => Promise<void>

  // Alarm firing
  triggerAlarm: (alarm: Alarm) => void
  snoozeAlarm: (alarmId: string) => void
  dismissAlarm: (alarmId: string) => void
}
```

#### Player Store (`src/stores/playerStore.ts`)

```ts
interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  volume: number
  progress: number // 0-100
  duration: number

  playTrack: (track: Track) => void
  playQueue: (tracks: Track[], startIndex?: number) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setVolume: (vol: number) => void
  seek: (percent: number) => void
  next: () => void
  prev: () => void
}
```

#### UI Store (`src/stores/uiStore.ts`)

```ts
interface UIState {
  currentPage: Page
  sidebarOpen: boolean
  theme: 'system' | 'light' | 'dark'
  installPromptEvent: BeforeInstallPromptEvent | null

  setPage: (page: Page) => void
  toggleSidebar: () => void
  setTheme: (theme: string) => void
  setInstallPrompt: (event: any) => void
}
```

### Step 1.4 — IndexedDB Blob Storage for Local Audio Files

**`src/db/audioStorage.ts`:**

```ts
// Store audio files as blobs in IndexedDB so they persist and work offline
// Uses a separate Dexie database for blobs to avoid polluting the main DB

const audioDb = new Dexie('AlarmPlaylistAudio')

audioDb.version(1).stores({
  files: 'id, name, size, type, uploadedAt'
})

export async function storeAudioFile(file: File): Promise<string> {
  const id = nanoid()
  await audioDb.files.put({ id, name: file.name, size: file.size, type: file.type, uploadedAt: Date.now(), data: file })
  return id
}

export async function getAudioFile(id: string): Promise<Blob | undefined> {
  const entry = await audioDb.files.get(id)
  return entry?.data
}

export async function deleteAudioFile(id: string): Promise<void> {
  await audioDb.files.delete(id)
}
```

---

## Phase 2: UI Shell & Routing

### Step 2.1 — App Shell Layout

**`src/components/layout/AppShell.tsx`:**
- Sidebar/ Bottom tab navigation (responsive)
  - Desktop: sidebar (240px) with icons + labels
  - Mobile: bottom tab bar with icons
- Pages: Alarms, Playlists, Player, Settings
- Mini player bar at bottom (shows current track when playing)

**Routing:**

```
/            → redirect to /alarms
/alarms      → AlarmListPage
/playlists   → PlaylistListPage
/playlists/:id → PlaylistDetailPage
/player      → PlayerPage
/settings    → SettingsPage
```

### Step 2.2 — Responsive Breakpoints

```
Mobile:   < 640px    — bottom nav, single column
Tablet:   640-1024px — sidebar collapsed, two columns
Desktop:  > 1024px   — sidebar expanded, multi-column
```

### Step 2.3 — Theme System

- Support light/dark/system themes
- Store preference in IndexedDB (or localStorage for simplicity)
- Use Tailwind's `dark:` variant with `class` strategy
- Toggle via Settings page

---

## Phase 3: Playlist Management

### Step 3.1 — Playlist List Page (`/playlists`)

**Components:**
- `PlaylistCard` — thumbnail grid of tracks, name, track count, source badge
- `CreatePlaylistModal` — name, color picker, source selector
- `EmptyState` — "Add your first playlist" prompt
- `PlaylistSourceBadge` — shows "Local", "YouTube", "Spotify"

**Interactions:**
- Tap card → navigate to `/playlists/:id`
- Long-press / right-click → context menu (rename, delete, share)
- FAB (+) button → create playlist modal

### Step 3.2 — Playlist Detail Page (`/playlists/:id`)

**Components:**
- `PlaylistHeader` — name, source, track count, play all button
- `TrackList` — sortable list of tracks
- `TrackRow` — title, artist, duration, drag handle, remove button
- `AddTrackBar` — search/add tracks from current source

**Supported sources:**

#### 3.2.1 — Local Files

```ts
// File picker accepts: .mp3, .wav, .ogg, .flac, .m4a, .aac
<input type="file" accept="audio/*" multiple />

// On selection:
for (const file of files) {
  const blobId = await storeAudioFile(file)
  const track: Track = {
    id: nanoid(),
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: 'Unknown',
    duration: await getAudioDuration(file),
    url: URL.createObjectURL(file), // temporary for playback
    source: 'local',
    blobId,
  }
  tracks.push(track)
}
```

Also support:
- **Drag & drop** files onto playlist
- **Folder import** (via File System Access API in Chrome/Edge)
- **M3U/PLS playlist files** — parse the file, resolve paths

#### 3.2.2 — YouTube Playlists

**Flow:**
1. User clicks "Connect YouTube"
2. OAuth 2.0 flow (via Google Identity Services library)
3. Fetch user's playlists: `GET https://www.googleapis.com/youtube/v3/playlists`
4. Fetch playlist items: `GET https://www.googleapis.com/youtube/v3/playlistItems`
5. Store playlist metadata + track list (YouTube video IDs)
6. Playback via `youtube-dl` proxy → not feasible in browser

**Alternative:** Use the YouTube IFrame Player API to embed and play videos. However:
- Audio-only is not available
- Requires visible player (can hide with CSS)
- Ads may play
- Background playback requires Premium on mobile

**Better alternative:** Search YouTube, extract the audio stream URL via a proxy service (not ideal for a simple app).

**Pragmatic approach:** Allow users to save YouTube playlist metadata, then play audio by searching for the track name on a free music source (like Piped / Invidious instances) or just treat YouTube playlists as "reference metadata" and use local/file sources for actual audio.

**For v1:** Local files only. YouTube/Spotify integration added in v2 after core is solid.

#### 3.2.3 — Spotify Playlists

**Flow:**
1. OAuth via Spotify Web API
2. Fetch playlists: `GET https://api.spotify.com/v1/me/playlists`
3. Fetch tracks (30s previews available from Spotify)
4. Preview URLs (30s) can be played in browser
5. Full tracks require Spotify Premium + SDK

**For v1:** Store metadata only. Show "Play on Spotify" button that opens the Spotify app.

### Step 3.3 — Import/Export

- **Export playlist** as M3U file
- **Import** M3U / PLS files
- **Share playlist** via Web Share API (mobile) or clipboard link

---

## Phase 4: Music Player

### Step 4.1 — Howler.js Audio Engine

**`src/services/player.ts`:**

```ts
import { Howl } from 'howler'

class AudioPlayer {
  private howl: Howl | null = null
  private onEndCallback: (() => void) | null = null

  load(url: string, options?: { volume?: number; onEnd?: () => void }) {
    this.unload()
    this.onEndCallback = options?.onEnd ?? null
    this.howl = new Howl({
      src: [url],
      html5: true,          // Use HTML5 Audio (required for streaming)
      volume: (options?.volume ?? 1) / 100,
      onend: () => this.onEndCallback?.(),
      onloaderror: (_id, err) => console.error('Audio load error:', err),
    })
  }

  play() { this.howl?.play() }
  pause() { this.howl?.pause() }
  stop() { this.howl?.stop() }
  seek(percent: number) {
    if (this.howl) {
      this.howl.seek(this.howl.duration() * (percent / 100))
    }
  }
  volume(v: number) { this.howl?.volume(v / 100) }
  duration(): number { return this.howl?.duration() ?? 0 }
  progress(): number {
    if (!this.howl) return 0
    return (this.howl.seek() as number) / this.howl.duration() * 100
  }
  isPlaying(): boolean { return this.howl?.playing() ?? false }
  unload() { this.howl?.unload(); this.howl = null }
}
```

### Step 4.2 — Player UI

**Components:**
- `PlayerPage` — full-screen player (album art, progress bar, controls)
- `MiniPlayer` — persistent bottom bar (track info, play/pause, progress)
- `PlaybackControls` — prev, play/pause, next, shuffle, repeat
- `VolumeSlider` — volume control with mute toggle
- `ProgressBar` — clickable/draggable seek bar

### Step 4.3 — Queue Management

- "Play All" button on playlist → queues all tracks
- Shuffle mode (randomize queue order)
- Repeat modes: none, repeat one, repeat all
- Track auto-advance on end

---

## Phase 5: Alarm Engine

### Step 5.1 — Alarm CRUD UI

**Page: `/alarms`**

**Components:**
- `AlarmList` — list of alarms with toggle switches
- `AlarmCard` — time (large), name, days active, toggle, edit button
- `AlarmFormModal` — create/edit alarm with all options:

```
┌──────────────────────────────────┐
│  New Alarm                       │
│                                  │
│  Name: [ Wake Up          ]      │
│                                  │
│  Time: [  7  ] : [  00  ]  AM/PM │
│                                  │
│  Repeat:                         │
│  [S] [M] [T] [W] [T] [F] [S]    │
│                                  │
│  Playlist: [ Morning Vibes  ▼]   │
│  Song:     [ Random     ▼]       │
│            [ Specific Track ▼]   │
│                                  │
│  Volume:  [═══════════○══]  70%  │
│  ☑ Fade in (over 30s)           │
│  Snooze: [ 5 ] min, max [ 3 ]   │
│                                  │
│        [Cancel]    [Save]        │
└──────────────────────────────────┘
```

### Step 5.2 — Alarm Scheduling

**`src/services/alarmScheduler.ts`:**

```ts
interface ScheduledAlarm {
  alarmId: string
  timeoutId: number // return from setTimeout
  nextFire: number  // unix ms
}

class AlarmScheduler {
  private scheduled: Map<string, ScheduledAlarm> = new Map()
  private checkInterval: number | null = null

  // Called when page is loaded or alarms change
  async rescheduleAll(alarms: Alarm[]) {
    this.clearAll()
    for (const alarm of alarms.filter(a => a.enabled)) {
      this.scheduleOne(alarm)
    }
  }

  private scheduleOne(alarm: Alarm) {
    const now = new Date()
    const nextFire = this.calculateNextFire(alarm, now)
    const delay = nextFire.getTime() - now.getTime()

    const timeoutId = setTimeout(() => {
      this.fireAlarm(alarm)
      // Reschedule for next occurrence
      this.scheduleOne(alarm)
    }, delay)

    this.scheduled.set(alarm.id, { alarmId: alarm.id, timeoutId, nextFire: nextFire.getTime() })
  }

  private calculateNextFire(alarm: Alarm, from: Date): Date {
    // If alarm has no days, fire once at next time today (or tomorrow if already past)
    // Otherwise, find the next matching day
    const candidate = new Date(from)
    candidate.setHours(alarm.hour, alarm.minute, 0, 0)

    if (alarm.days.length === 0) {
      // One-time alarm
      if (candidate <= from) candidate.setDate(candidate.getDate() + 1)
      return candidate
    }

    // Repeating alarm — find next matching day
    for (let i = 0; i < 8; i++) {
      const testDay = new Date(candidate)
      testDay.setDate(testDay.getDate() + i)
      if (alarm.days.includes(testDay.getDay()) && testDay > from) {
        return testDay
      }
    }

    // Shouldn't reach here, but fall through
    return candidate
  }

  private fireAlarm(alarm: Alarm) {
    // Play alarm sound
    window.dispatchEvent(new CustomEvent('alarm-fire', { detail: alarm }))

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('AlarmPlaylist', {
        body: `⏰ ${alarm.name}`,
        tag: alarm.id,
        requireInteraction: true,
      })
    }
  }

  clearAlarm(alarmId: string) {
    const existing = this.scheduled.get(alarmId)
    if (existing) {
      clearTimeout(existing.timeoutId)
      this.scheduled.delete(alarmId)
    }
  }

  clearAll() {
    for (const [, scheduled] of this.scheduled) {
      clearTimeout(scheduled.timeoutId)
    }
    this.scheduled.clear()
  }
}
```

### Step 5.3 — Alarm Trigger (Audio Playback)

**`src/services/alarmAudio.ts`:**

When alarm fires:
1. Request notification permission (if not granted)
2. Get the track to play (specific or random from playlist)
3. Load the audio
4. If fade-in: start at volume 0, ramp to target over `fadeInDuration`
5. Show alarm screen: snooze / dismiss buttons
6. On snooze: stop audio, schedule re-fire in `snoozeMinutes`
7. On dismiss: stop audio, mark alarm as fired

**Alarm Screen (`AlarmAlertOverlay`):**
- Full screen, bright (even in dark mode)
- Shows alarm name, current time
- Track info (title, artist, album art)
- Big snooze button (5 min)
- Big dismiss button
- Volume control

### Step 5.4 — Missing Alarm Reliability (PWA Limitations)

**Problem:** If the user closes the browser/tab, `setTimeout` won't fire and audio won't play.

**Mitigations (in order of reliability):**

1. **Keep the tab alive** — Suggest users keep the browser open. Many people do this for alarm apps anyway.
2. **Service Worker Notification** — Even if the page is closed, the Service Worker can show a notification (but cannot play audio on iOS).
3. **Periodic Background Sync** (Android Chrome) — Can check for pending alarms periodically:
   ```ts
   // Register in Service Worker
   self.registration.periodicSync.register('alarm-check', {
     minInterval: 60 * 1000 // check every minute
   })
   ```
4. **Native wrapper** — If reliability is critical, wrap the PWA with Capacitor to gain native alarm capabilities. No code rewrite needed.

**Documentation:** Clearly document in the app that the browser/tab must remain open for alarms to fire.

---

## Phase 6: YouTube Integration (v2 Feature)

### Step 6.1 — YouTube Data API Setup

- Register project in Google Cloud Console
- Enable YouTube Data API v3
- Create OAuth 2.0 credentials (Web application type)
- Configure authorized JavaScript origins

### Step 6.2 — OAuth Flow

Use Google Identity Services library:

```ts
import { google } from 'googleapis' // or Google Identity Services

async function authenticateWithGoogle() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    callback: (response) => {
      if (response.access_token) {
        saveToken(response.access_token)
      }
    },
  })
  tokenClient.requestAccessToken()
}
```

### Step 6.3 — Fetch Playlists & Tracks

```ts
async function fetchYouTubePlaylists(token: string): Promise<Playlist[]> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await response.json()
  // Map to our Playlist type
}

async function fetchYouTubePlaylistItems(token: string, playlistId: string): Promise<Track[]> {
  let allTracks = []
  let pageToken = ''

  do {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    allTracks.push(...data.items.map(mapToTrack))
    pageToken = data.nextPageToken
  } while (pageToken)

  return allTracks
}
```

### Step 6.4 — YouTube Audio Playback

**Problem:** Cannot play YouTube audio in `<audio>` or Howler.js directly due to DRM/format restrictions.

**Options:**
A. **YouTube IFrame Player API** — embed hidden player, control via JS. Shows video, not audio-only. Background playback limited.
B. **Piped API** (open-source YouTube proxy) — can extract audio stream URLs. Legal gray area.
C. **Open YouTube Music app** — "Open in YouTube Music" button. Falls back to native app.

**Recommendation for v1:** Store YouTube playlists as metadata only. Show "Play on YouTube Music" button. Local files are used for actual audio playback.

---

## Phase 7: Spotify Integration (v2 Feature)

### Step 7.1 — Spotify API Setup

- Register app in Spotify Developer Dashboard
- Get Client ID
- Set redirect URI

### Step 7.2 — OAuth Flow (PKCE)

```ts
// PKCE flow for security (no client secret in browser)
async function authenticateWithSpotify() {
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await sha256(codeVerifier)

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: window.location.origin + '/spotify-callback',
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: 'playlist-read-private playlist-read-collaborative',
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}
```

### Step 7.3 — Fetch Playlists & Tracks

```ts
async function fetchSpotifyPlaylists(token: string): Promise<Playlist[]> {
  const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await response.json()
  return data.items.map(mapToPlaylist)
}
```

### Step 7.4 — Spotify Audio Playback

**Options:**
A. **30s previews** — Spotify provides 30s MP3 preview URLs for most tracks. These are playable in Howler.js.
B. **Spotify Web Playback SDK** — Requires Spotify Premium. Embeds an SDK that streams full tracks.
C. **"Open in Spotify"** — fallback button.

**Recommendation for v1:** Use 30s previews (better than nothing). Show "Open in Spotify" for full playback. Full SDK integration is v2.

---

## Phase 8: Service Worker

### Step 8.1 — Caching Strategy

Generated by `vite-plugin-pwa` (Workbox). Default: precache all build assets.

Add runtime caching for:
- Google Fonts (if used)
- Album art thumbnails (Cache First)
- API responses (Network First with fallback)

### Step 8.2 — Custom Service Worker Logic

If we need custom SW logic (e.g., periodic sync for alarms), inject via:

```ts
// In vite.config.ts
VitePWA({
  srcDir: 'src',
  filename: 'sw.ts',
  strategies: 'injectManifest',
})
```

**`src/sw.ts`:**
```ts
import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

// Periodic background sync for alarm checking
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'alarm-check') {
    event.waitUntil(checkPendingAlarms())
  }
})

async function checkPendingAlarms() {
  // Could check IndexedDB for pending alarms
  // However, Chrome's SW IndexedDB access is limited
  // Better approach: pass alarm data via postMessage from main thread
  // For now, this is a placeholder for future enhancement
}
```

**Note:** Service Worker periodic sync has limited browser support (Chrome 80+, Android only). Not a silver bullet.

---

## Phase 9: Testing

### Unit Tests (Vitest)

| Module | Tests |
|---|---|
| `services/alarmScheduler.ts` | nextFire calculation, recurrence patterns, single-fire |
| `services/player.ts` | play/pause/stop/seek state |
| `stores/*Store.ts` | state transitions, async operations |
| `utils/*.ts` | all utility functions |
| `db/audioStorage.ts` | blob store/retrieve/delete |

### Component Tests (Vitest + Testing Library)

| Component | Tests |
|---|---|
| `AlarmForm` | validation, submit, days selection |
| `PlaylistCard` | renders name, track count |
| `TrackRow` | displays info, remove action |
| `TimePicker` | hour/min selection, AM/PM toggle |

### E2E Tests (Playwright)

```bash
npx playwright install
npx playwright test
```

| Test | Scenario |
|---|---|
| Create alarm | Fill form, save, verify in list |
| Toggle alarm | Toggle switch, verify enabled/disabled |
| Create playlist | Add name, select source, create |
| Import local files | Pick audio files, verify tracks appear |
| Play track | Tap play, verify player shows |
| Alarm triggers | Mock timer, verify alarm screen appears |

---

## Phase 10: Build & Deploy

### Step 10.1 — Production Build

```bash
npm run build
# Output: ./dist (static files + PWA assets)
```

### Step 10.2 — GitHub Pages Deployment

**Option A: GitHub Actions**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Option B: Vercel / Netlify**

One-click deploy from GitHub repo. Zero config (both auto-detect Vite).

---

## UI / UX Specifications

### Color Palette

```
Primary:    Indigo (#6366f1)
Background: Slate-900 (#0f172a) dark, White (#fff) light
Surface:    Slate-800 (#1e293b) dark, Gray-100 (#f3f4f6) light
Text:       Gray-100 (#f3f4f6) dark, Gray-900 (#111827) light
Accent:     Violet (#8b5cf6) for interactive elements
Danger:     Red (#ef4444) for destructive actions
Success:    Emerald (#10b981) for active/on states
```

### Typography

- Font: Inter (loaded via Google Fonts, cached by SW)
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Sizes: 12/14/16/18/20/24/32/48 (in rems via Tailwind)

### Component Tree

```
<App>
  <ThemeProvider>
    <Router>
      <AppShell>
        <Sidebar />            ← desktop sidebar
        <BottomNav />          ← mobile bottom tabs
        <main>
          <Routes>
            <AlarmPage>
              <AlarmList>
                <AlarmCard />
              </AlarmList>
              <AddAlarmFAB />
              <AlarmFormModal />
            </AlarmPage>

            <PlaylistsPage>
              <PlaylistList>
                <PlaylistCard />
              </PlaylistList>
              <AddPlaylistFAB />
              <CreatePlaylistModal />
            </PlaylistsPage>

            <PlaylistDetailPage>
              <PlaylistHeader />
              <TrackList>
                <TrackRow />
              </TrackList>
              <AddTrackBar />
            </PlaylistDetailPage>

            <PlayerPage>
              <AlbumArt />
              <TrackInfo />
              <ProgressBar />
              <PlaybackControls />
              <VolumeSlider />
            </PlayerPage>

            <SettingsPage>
              <ThemeSelector />
              <NotificationPermission />
              <About />
            </SettingsPage>
          </Routes>
        </main>
        <MiniPlayer />
      </AppShell>

      {/* Alarm alert overlay — rendered above everything */}
      <AlarmAlertOverlay />
    </Router>
  </ThemeProvider>
</App>
```

### Routes & Navigation

| Path | Page | Description |
|---|---|---|
| `/` | — | Redirects to `/alarms` |
| `/alarms` | `AlarmPage` | List alarms, create/edit/delete |
| `/playlists` | `PlaylistsPage` | List playlists, create |
| `/playlists/:id` | `PlaylistDetailPage` | View/edit playlist tracks |
| `/player` | `PlayerPage` | Full-screen music player |
| `/settings` | `SettingsPage` | Theme, notifications, about |

---

## Edge Cases & Error Handling

### Audio Errors
- File corrupted → show error toast, skip track, auto-advance
- Format unsupported → skip, log which codec
- File deleted after import → attempt play, catch error, mark track as unavailable

### Alarm Edge Cases
- Alarm set for past time (e.g., 7:00 AM but it's 7:05 PM) → fire next day
- Alarm with no days selected → one-time alarm, fires at next occurrence
- Multiple alarms fire at same time → fire all simultaneously (audio mixing)
- DST change → alarms may shift by 1 hour. Mitigation: recalculate on device time change (listen for `timechange` event on mobile, or recalc every hour)
- Device in Do Not Disturb → notification may be silenced. Mitigation: request notification bypass (Android) or document limitation (iOS)

### Storage Edge Cases
- IndexedDB quota exceeded → show warning, suggest clearing old local files
- Safari private browsing → IndexedDB may throw. Catch and show meaningful error
- Multiple tabs → Zustand handles in-memory state. IndexedDB ensures consistency. Use `dexie-observable` for cross-tab sync if needed

### Network Errors (YouTube / Spotify APIs)
- Token expired → redirect to re-authenticate
- Rate limited → show "try again in X minutes"
- No internet → show cached data, disable streaming features

---

## Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 2s |
| Lighthouse Performance | > 90 |
| Lighthouse PWA | 100 (pass all checks) |
| Bundle size (initial JS) | < 200 KB gzip |
| Audio startup latency | < 500ms |
| Alarm scheduling precision | ±1 second |

---

## File Manifest (Complete)

```
alarm-playlist/
├── .eslintrc.cjs
├── .prettierrc
├── .github/
│   └── workflows/
│       └── deploy.yml
├── index.html
├── package.json
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   └── icon-512.png
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── IconButton.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MiniPlayer.tsx
│   │   ├── playlist/
│   │   │   ├── PlaylistCard.tsx
│   │   │   ├── CreatePlaylistModal.tsx
│   │   │   ├── PlaylistHeader.tsx
│   │   │   ├── TrackList.tsx
│   │   │   ├── TrackRow.tsx
│   │   │   └── AddTrackBar.tsx
│   │   ├── alarm/
│   │   │   ├── AlarmCard.tsx
│   │   │   ├── AlarmList.tsx
│   │   │   ├── AlarmFormModal.tsx
│   │   │   ├── DayPicker.tsx
│   │   │   ├── TimePicker.tsx
│   │   │   └── AlarmAlertOverlay.tsx
│   │   └── player/
│   │       ├── AlbumArt.tsx
│   │       ├── TrackInfo.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── PlaybackControls.tsx
│   │       └── VolumeSlider.tsx
│   ├── pages/
│   │   ├── AlarmPage.tsx
│   │   ├── PlaylistsPage.tsx
│   │   ├── PlaylistDetailPage.tsx
│   │   ├── PlayerPage.tsx
│   │   └── SettingsPage.tsx
│   ├── stores/
│   │   ├── alarmStore.ts
│   │   ├── playlistStore.ts
│   │   ├── playerStore.ts
│   │   └── uiStore.ts
│   ├── db/
│   │   ├── db.ts
│   │   └── audioStorage.ts
│   ├── services/
│   │   ├── alarmScheduler.ts
│   │   ├── alarmAudio.ts
│   │   ├── player.ts
│   │   ├── youtube.ts
│   │   └── spotify.ts
│   ├── hooks/
│   │   ├── useAlarms.ts
│   │   ├── usePlaylists.ts
│   │   ├── usePlayer.ts
│   │   ├── useTheme.ts
│   │   └── useInstallPrompt.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── time.ts
│       ├── format.ts
│       └── audio.ts
```

---

## Development Order (Recommended)

| Order | Phase | Deliverable |
|---|---|---|
| 1 | Project scaffolding | Running Vite dev server with React + TS + Tailwind |
| 2 | Types + DB | Type definitions, Dexie schema, stores |
| 3 | UI Shell | AppShell, routing, sidebar, bottom nav |
| 4 | Playlists (local) | Create, view, edit playlists with local file import |
| 5 | Music player | Audio playback, queue, controls, mini player |
| 6 | Alarm engine (core) | Alarm CRUD, scheduling, triggering |
| 7 | Alarm UI | Alarm form, list, alert overlay |
| 8 | PWA polish | Icons, manifest, service worker, install prompt |
| 9 | Testing | Unit tests, component tests, E2E |
| 10 | Deployment | CI/CD, GitHub Pages, custom domain |
| 11 | YouTube (v2) | OAuth, playlist fetch |
| 12 | Spotify (v2) | OAuth, playlist fetch, 30s previews |
