import { test, expect } from '@playwright/test'

test('loads the app', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1:has-text("AlarmPlaylist")')).toBeVisible()
})

test('navigates to playlists', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Playlists')
  await expect(page).toHaveURL(/\/playlists/)
})

test('shows alarm page', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Alarms')
  await expect(page).toHaveURL(/\/alarms/)
})
