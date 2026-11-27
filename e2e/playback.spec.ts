import { test, expect, type Page } from '@playwright/test'

/**
 * Real end-to-end playback. Howler is NOT mocked here, so this is the only test
 * that catches a blob URL arriving at Howler without a usable format, a frozen
 * progress bar, a dead seek or a replay that immediately re-ends.
 */

function makeWav(seconds: number, sampleRate = 8000): Buffer {
  const samples = Math.floor(sampleRate * seconds)
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + samples * 2, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.2 * 32767), 44 + i * 2)
  }
  return buffer
}

const WAV = makeWav(6)

declare global {
  interface Window {
    Howler?: { _howls?: Array<{ playing: () => boolean; seek: () => number; _format?: string[] }> }
  }
}

function firstHowl(page: Page) {
  return page.evaluate(() => {
    const howl = window.Howler?._howls?.[0]
    if (!howl) return null
    return {
      playing: howl.playing(),
      seek: howl.seek(),
      format: howl._format?.[0] ?? null,
    }
  })
}

async function createPlaylistWithTone(page: Page, name: string) {
  await page.goto('/playlists')
  // Guard against a stale/foreign server on the port: fail on the app, not on
  // a mysterious missing button in someone else's page.
  await expect(page.getByRole('heading', { name: 'AlarmPlaylist' })).toBeVisible()
  await page.getByRole('button', { name: /New Playlist/ }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText(name)).toBeVisible()

  await page.getByText(name).click()
  await expect(page).toHaveURL(/\/playlists\/.+/)

  await page
    .locator('input[type=file][accept="audio/*"]')
    .first()
    .setInputFiles({ name: 'e2e-tone.wav', mimeType: 'audio/wav', buffer: WAV })
  await expect(page.getByText('e2e-tone', { exact: true })).toBeVisible()
}

test('imports a local WAV and keeps progress, seek and replay working', async ({ page }) => {
  test.setTimeout(45_000)
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await createPlaylistWithTone(page, 'E2E Local')

  await page.getByRole('button', { name: 'Play All' }).click()
  await expect(page).toHaveURL(/\/player/)
  const slider = page.locator('main').getByRole('slider', { name: 'Seek' })
  await expect(slider).toBeVisible()

  // The engine must have accepted the blob URL and started. An empty _format
  // is exactly the historical "No codec support" failure.
  await page.waitForFunction(
    () => {
      const howl = window.Howler?._howls?.[0]
      return Boolean(howl?.playing() && howl._format?.[0])
    },
    undefined,
    { timeout: 10_000 },
  )
  expect(await firstHowl(page)).toMatchObject({ playing: true, format: 'wav' })

  // The page must show the same position the engine has (it used to stay 0:00).
  await page.waitForFunction(
    () => {
      const text = document.querySelector('[role="slider"][aria-label="Seek"]')?.getAttribute('aria-valuetext')
      return /^0:0[1-5] of 0:06$/.test(text ?? '')
    },
    undefined,
    { timeout: 8000 },
  )

  // Clicking the middle of the bar must actually move the engine.
  const box = await slider.boundingBox()
  if (!box) throw new Error('progress bar has no layout box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForFunction(
    () => {
      const seek = window.Howler?._howls?.[0]?.seek() ?? -1
      return seek > 2 && seek < 4.5
    },
    undefined,
    { timeout: 4000 },
  )
  expect(await slider.getAttribute('aria-valuetext')).toMatch(/^0:0[234] of 0:06$/)

  // Jump near the end, let it finish, then press play again. A finished howl
  // used to re-emit `end` immediately, so nothing restarted.
  await page.mouse.click(box.x + box.width * 0.97, box.y + box.height / 2)
  await page.waitForFunction(
    () => {
      const howl = window.Howler?._howls?.[0]
      return Boolean(howl && !howl.playing())
    },
    undefined,
    { timeout: 5000 },
  )

  await page.locator('main').getByRole('button', { name: 'Play' }).click()
  await page.waitForFunction(
    () => {
      const howl = window.Howler?._howls?.[0]
      return Boolean(howl?.playing() && howl.seek() < 1)
    },
    undefined,
    { timeout: 5000 },
  )

  expect(errors.filter((text) => /codec|failed to load audio/i.test(text))).toEqual([])
})

test('plays an imported track again after a reload (stored blob is re-resolved)', async ({ page }) => {
  test.setTimeout(30_000)
  await createPlaylistWithTone(page, 'E2E Persist')

  await page.reload()
  await expect(page.getByText('E2E Persist')).toBeVisible()
  await page.getByText('E2E Persist').click()
  await page.getByRole('button', { name: 'Play All' }).click()

  await page.waitForFunction(
    () => {
      const howl = window.Howler?._howls?.[0]
      return Boolean(howl?.playing() && howl._format?.[0] === 'wav')
    },
    undefined,
    { timeout: 10_000 },
  )
})
