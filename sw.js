importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js')

workbox.setConfig({ debug: false })

const { precaching, routing, strategies, expiration } = workbox

// Precache all assets injected by vite-plugin-pwa
precaching.precacheAndRoute(self.__WB_MANIFEST)

// Cache Google Fonts
routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new strategies.CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new expiration.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 * 365 })],
  })
)

// Cache Invidious playlist API responses (used for YouTube playlist imports)
// with a stale-while-revalidate strategy so the app can show cached data
// while refreshing in the background, and works briefly offline.
routing.registerRoute(
  ({ url }) => /\/api\/v1\/playlists\//.test(url.pathname),
  new strategies.StaleWhileRevalidate({
    cacheName: 'invidious-playlists',
    plugins: [new expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 * 7 })],
  })
)

// Periodic background sync for alarm reliability (Android Chrome)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'alarm-check') {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          client.postMessage({ type: 'PERIODIC_ALARM_CHECK' })
        }
      })()
    )
  }
})

// Keep service worker alive during alarm windows
self.addEventListener('message', (event) => {
  if (event.data?.type === 'KEEP_AWAKE') {
    event.waitUntil(
      new Promise((resolve) => setTimeout(resolve, event.data.duration || 60000))
    )
  }
})
