// Copy dist/index.html -> dist/404.html after build.
//
// GitHub Pages serves /404.html for any path that doesn't match a static
// file. By making 404.html identical to index.html, deep-link refreshes
// (e.g. /AlarmPlaylist/playlists) load the SPA instead of GitHub's default
// 404 page. React Router then reads window.location.pathname and renders
// the correct route. URL bar stays clean — no redirect, no hash fragments.
//
// Run automatically via `npm run build` (postbuild hook).

import { copyFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const src = path.join(distDir, 'index.html')
const dest = path.join(distDir, '404.html')

try {
  await stat(src)
} catch {
  console.error(`[copy-404] Source not found: ${src}. Did the build run?`)
  process.exit(1)
}

await copyFile(src, dest)
console.log('[copy-404] Copied dist/index.html -> dist/404.html')
