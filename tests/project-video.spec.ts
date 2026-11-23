import { test, expect } from '@playwright/test'

for (const variant of [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    poster: 'newdesktab-promo-poster.jpg',
    video: 'newdesktab-promo-1080p.mp4',
  },
  {
    name: 'mobile portrait',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    poster: 'newdesktab-promo-vertical-poster.jpg',
    video: 'newdesktab-promo-vertical.mp4',
  },
]) {
  test.describe(variant.name, () => {
    test.use({ viewport: variant.viewport, hasTouch: variant.hasTouch })

    test('the promotional cover loads its matching video on demand and every dismissal stops playback', async ({
      page,
    }) => {
      const mediaRequests: string[] = []
      page.on('request', (request) => {
        if (/\.mp4(?:[?#]|$)/.test(request.url())) mediaRequests.push(request.url())
      })
      await page.goto('./#projects')
      await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
      const trigger = page.getByRole('button', { name: 'Ver vídeo promocional de New DeskTab' })
      await expect(trigger).toBeVisible()
      const poster = trigger.locator('img')
      await poster.evaluate((image) => (image as HTMLImageElement).decode())
      expect(await poster.evaluate((image) => (image as HTMLImageElement).currentSrc)).toContain(
        `/images/${variant.poster}`,
      )
      await expect(page.locator('video')).toHaveCount(0)
      expect(mediaRequests).toEqual([])

      const dialog = page.getByRole('dialog', { name: 'Vídeo promocional de New DeskTab' })
      const video = dialog.locator('video')
      const startPlayback = async (keyboard = false) => {
        if (keyboard) {
          await trigger.focus()
          await page.keyboard.press('Enter')
        } else await trigger.click()
        await expect(dialog).toBeVisible()
        await expect(video).toHaveJSProperty('controls', true)
        await expect(video).toHaveJSProperty('playsInline', true)
        await expect(video).toHaveAttribute('preload', 'none')
        await expect
          .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentSrc))
          .toContain(`/videos/${variant.video}`)
        await expect
          .poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime))
          .toBeGreaterThan(0.1)
        return (await video.elementHandle())!
      }

      const firstPlayback = await startPlayback()
      await dialog.getByRole('button', { name: 'Cerrar vídeo' }).click()
      await expect(dialog).toBeHidden()
      await expect(page.locator('video')).toHaveCount(0)
      expect(await firstPlayback.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(
        true,
      )
      await firstPlayback.dispose()

      const keyboardPlayback = await startPlayback(true)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(page.locator('video')).toHaveCount(0)
      expect(
        await keyboardPlayback.evaluate((element) => (element as HTMLVideoElement).paused),
      ).toBe(true)
      await expect(trigger).toBeFocused()
      await keyboardPlayback.dispose()

      const finalPlayback = await startPlayback()
      await page.evaluate(() => {
        window.location.hash = '#contact'
      })
      await expect(page.locator('section[data-view="contact"]')).toBeVisible()
      await expect(dialog).toBeHidden()
      await expect(page.locator('video')).toHaveCount(0)
      expect(await finalPlayback.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(
        true,
      )
      await finalPlayback.dispose()
      expect(mediaRequests.length).toBeGreaterThan(0)
      expect(
        mediaRequests.every((url) => new URL(url).pathname.endsWith(`/videos/${variant.video}`)),
      ).toBe(true)
    })
  })
}
