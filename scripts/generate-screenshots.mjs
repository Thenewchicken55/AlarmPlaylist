// Generate PWA screenshots using Playwright
// Run: node scripts/generate-screenshots.mjs

import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const server = await createServer({ root: path.resolve(__dirname, '..'), logLevel: 'silent' })
  await server.listen()

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:' + server.config.server.port)
  await page.waitForTimeout(2000)

  const screenshotsDir = path.resolve(__dirname, '..', 'public')
  await page.screenshot({ path: path.join(screenshotsDir, 'screenshot-desktop.png'), fullPage: false })

  await browser.close()
  await server.close()
  console.log('Screenshots generated in public/')
}

main().catch(console.error)
