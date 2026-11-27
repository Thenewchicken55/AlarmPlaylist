import { defineConfig } from '@playwright/test'

// A dedicated, strict port: reusing whatever happens to listen on 4173 let the
// suite test another app entirely (it silently ran against a different project
// once). Failing to bind is better than testing the wrong site.
const PORT = 4175

export default defineConfig({
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  testDir: 'e2e',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Playback tests drive audio from a real click, but the engine starts in an
    // effect after navigation, so allow autoplay rather than depending on the
    // browser's gesture heuristics in headless CI.
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
    },
  },
})
