import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 30000,
  },
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
  },
})
