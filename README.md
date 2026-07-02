# AlarmPlaylist

A cross-platform alarm clock that wakes you up with music from your playlists. Set an alarm with a specific song or a random track from any of your playlists.

## Problem & Goal

Standard alarm clocks are jarring. This app lets you wake up to music you actually like, from playlists you curate. The key constraint: **zero app-store fees** — no Apple Developer Program ($99/yr) and no Play Store registration ($25 one-time). Must work on both phone and PC.

---

## Tech Stack Brainstorm

### Requirement Analysis

| Requirement | Priority | Constraints |
|---|---|---|
| Phone + PC access | Must-have | Single codebase, responsive |
| No app store fees | Must-have | No paid dev accounts |
| Multiple playlist sources | Should-have | Local files, streaming services |
| Specific or random song alarm | Must-have | Configurable per alarm |
| Reliable alarm firing | Must-have | Even when app is backgrounded |

---

### Option 1: PWA (Progressive Web App) — **RECOMMENDED**

**How it works:** A website that can be "installed" to the user's home screen, works offline, and behaves like a native app.

| Platform | Install Method | Fee? |
|---|---|---|
| Android Chrome | "Add to Home Screen" prompt | Free |
| iOS Safari | Share → "Add to Home Screen" | Free |
| Windows (Edge/Chrome) | Install button in address bar | Free |
| macOS (Safari/Chrome) | Install via browser menu | Free |

**Pros:**
- Zero cost to distribute
- Single codebase (HTML/CSS/JS)
- Service Workers for offline + background audio
- Web Audio API for precise sound scheduling
- Auto-updates (no app store review)
- Responsive by default

**Cons:**
- iOS kills service workers ~30s after backgrounding — alarms may not fire when app is fully closed
- No access to native alarm APIs (android.permission.SET_ALARM)
- YouTube/Spotify DRM-protected streams not playable via `<audio>`
- No background audio on iOS (Apple restriction)

**Key Libraries:**

| Concern | Library |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| PWA wrapper | vite-plugin-pwa (Workbox) |
| Styling | Tailwind CSS 3 |
| State management | Zustand |
| Storage | Dexie.js (IndexedDB wrapper) |
| Audio playback | Howler.js (Web Audio API wrapper) |
| Routing | React Router 6 |
| Icons | Lucide React |
| Testing | Vitest + Playwright |

---

### Option 2: React Native + Expo

| Platform | Install Method | Fee? |
|---|---|---|
| Android | APK sideload / Any Android store | Free |
| iOS | Expo Go (dev only) | Free |
| Web | PWA via expo-web | Free |
| iOS native | Requires Apple Developer account | $99/yr |

**Pros:**
- True native alarm APIs (Android AlarmManager)
- Background audio via expo-av
- Access to device notifications
- Can still target web as PWA

**Cons:**
- iOS distribution locked behind paid account
- Larger bundle size
- More complex build pipeline
- Expo Go limitations for native modules

---

### Option 3: Tauri v2

| Platform | Install Method | Fee? |
|---|---|---|
| Windows | EXE/MSI sideload | Free |
| macOS | DMG sideload | Free (no notarization) |
| Linux | AppImage/Flatpak | Free |
| Android | APK sideload | Free |
| iOS | Needs Xcode + paid account | $99/yr |

**Pros:**
- True native capabilities (system tray, notifications, alarms)
- Small bundle (uses OS webview, not bundled Chromium)
- Rust backend for performance-critical audio decoding
- Mobile support in v2

**Cons:**
- Mobile support still maturing
- No streaming DRM content
- Requires separate install per platform (not just a URL)
- User must sideload APK on Android

---

### Option 4: Flutter

| Platform | Install Method | Fee? |
|---|---|---|
| Android | APK sideload | Free |
| iOS | Needs paid account | $99/yr |
| Web | PWA | Free |
| Desktop | EXE/DMG | Free |

**Pros:**
- True cross-platform with native performance
- Rich audio libraries
- Web target works as PWA

**Cons:**
- Dart language (different from web ecosystem)
- iOS still requires paid account
- Web support is not as polished as native
- Larger app size

---

### Recommended Stack: PWA (Progressive Web App)

**Rationale:**
1. **Zero cost** — no accounts, no stores, no fees
2. **Instant distribution** — push an update, users get it immediately
3. **Responsive** — same code works on phone, tablet, laptop, desktop
4. **Good enough** — for an alarm app, the iOS background limitation is the main risk, but acceptable since:
   - On Android, PWAs can use periodic background sync
   - On desktop, the app can run in a window that stays alive
   - Users can keep the browser open (common for alarm usage)
   - Notification API still fires on iOS even if audio doesn't

For a future iteration where background reliability is critical, the app can be wrapped with **Capacitor** (converts PWA to native Android/iOS) without rewriting.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│                   PWA                        │
│  ┌───────────────────────────────────────┐   │
│  │         React App (SPA)               │   │
│  │  ┌─────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │Music│ │  Alarm   │ │Playlist  │   │   │
│  │  │Player│ │  Engine  │ │Manager   │   │   │
│  │  └─────┘ └──────────┘ └──────────┘   │   │
│  ├──────────────┬───────────────────────┤   │
│  │   Zustand    │    React Router       │   │
│  │   (state)    │    (routes)           │   │
│  ├──────────────┴───────────────────────┤   │
│  │        Service Worker                │   │
│  │  (offline cache, alarm trigger)      │   │
│  ├──────────────────────────────────────┤   │
│  │        IndexedDB (Dexie.js)          │   │
│  │  (playlists, songs, alarms, prefs)   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐    │
│  │        External Sources              │    │
│  │  ┌────────┐ ┌──────────┐ ┌────────┐│    │
│  │  │ Local  │ │ YouTube  │ │ Spotify││    │
│  │  │ Files  │ │ API      │ │ API    ││    │
│  │  └────────┘ └──────────┘ └────────┘│    │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Data Model

```
Playlist {
  id: string (nanoid)
  name: string
  source: 'local' | 'youtube' | 'spotify'
  sourceUrl?: string
  tracks: Track[]
  color: string (for UI accent)
  createdAt: number
}

Track {
  id: string
  title: string
  artist: string
  duration: number
  url?: string (local blob URL or streaming URL)
  thumbnail?: string
  source: 'local' | 'youtube' | 'spotify'
  sourceId?: string (YouTube video ID, Spotify track ID)
}

Alarm {
  id: string
  name: string
  hour: number
  minute: number
  days: number[] (0=Sun, 1=Mon, ...)
  enabled: boolean
  playlistId: string | null
  specificTrackId: string | null (null = random from playlist)
  volume: number (0-100)
  fadeIn: boolean
  snoozeMinutes: number
  repeatCount: number (0 = infinite until dismissed)
}
```

---

## Demo

Try it live at [https://Thenewchicken55.github.io/AlarmPlaylist/](https://Thenewchicken55.github.io/AlarmPlaylist/)

---

## Development

```bash
# Prerequisites: Node.js 20+ and npm
npm install
npm run dev     # Start dev server with HMR
npm run build   # Production build (outputs to ./dist)
npm run preview # Preview production build
npm run test    # Run tests
```

### API Credentials

YouTube and Spotify integration requires API credentials. Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `VITE_YOUTUBE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — create an OAuth 2.0 Web client, add `http://localhost:5173` as an authorized JavaScript origin |
| `VITE_SPOTIFY_CLIENT_ID` | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) — create an app, add `http://localhost:5173/spotify-callback` as a Redirect URI |

For **GitHub Pages deployment**, add these as [Actions secrets](https://github.com/Thenewchicken55/AlarmPlaylist/settings/secrets/actions) with the same names, and add `https://Thenewchicken55.github.io` as the authorized origin (YouTube) / redirect URI (Spotify).

---

### YouTube Client ID Setup Details

**Where to go**
Go to console.cloud.google.com and make sure the correct project is selected in the top-left project picker (this trips people up a lot — you can have the right code but wrong project selected).
In the left sidebar, click APIs & Services.
Look for Google Auth Platform — this used to be called "OAuth consent screen," but since 2024 it's been reorganized under Google Auth Platform, split into tabs for Branding, Audience, and Data Access.

If you don't see "Google Auth Platform" in the sidebar at all, it's usually because no OAuth-compatible API has been enabled on the project yet, or your account doesn't have Owner/Editor access — it only shows up once an API is turned on.

**Setting it up the first time**
If it's a brand new project, you'll see "Google Auth Platform not configured yet" — click Get started, which walks you through a short wizard: App name, support email, then Audience (pick External unless this is only for people inside your own Google Workspace org), then a contact email.

**Adding test users**
Once that's done, go to the Audience tab.
Your app starts in "Testing" mode, and only accounts on the test users list can sign in — everyone else gets an access_blocked error.
Click Add users, and enter your own email plus anyone else who needs to log in (teammates, QA, etc.) — up to 100 test users, and changes take effect immediately.

One thing to know: test users' authorizations expire 7 days after they consent, so if someone stops being able to log in after a week, that's likely why — they just need to go through the consent screen again.
Once you've got your test users added, that's the piece your Client ID needs — you don't have to publish the app to production or go through Google's verification process just to test it yourself.
