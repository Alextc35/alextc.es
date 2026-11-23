import { test, expect, type Page } from '@playwright/test'

async function openProjectImage(page: Page) {
  await page.goto('./#projects')
  await expect(page.locator('.intro-screen')).toBeHidden()
  if (await page.locator('.compact-view').count()) {
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Siguiente captura', exact: true }).click()
  }
  const trigger = page.getByRole('button', { name: /^Ampliar captura:/ }).first()
  await expect(trigger).toBeVisible()
  return trigger
}

test('project captures open at a larger size and fit desktop, mobile and short viewports', async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 400, height: 300 },
  ]) {
    await page.setViewportSize(size)
    const trigger = await openProjectImage(page)
    const thumbnail = trigger.locator('img')
    const source = await thumbnail.evaluate((image) => (image as HTMLImageElement).src)
    const thumbnailWidth = await thumbnail.evaluate(async (element) => {
      const image = element as HTMLImageElement
      await image.decode()
      const bounds = image.getBoundingClientRect()
      if (getComputedStyle(image).objectFit !== 'contain') return bounds.width
      const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight)
      return image.naturalWidth * scale
    })
    await trigger.click()
    const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
    await expect(viewer).toBeVisible()
    const image = viewer.locator('img')
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).src))
      .toBe(source)
    await expect(image).toHaveAttribute('alt', (await thumbnail.getAttribute('alt'))!)
    await expect(image).toBeVisible()
    await image.evaluate(async (element) => {
      await (element as HTMLImageElement).decode()
    })
    const bounds = (await image.boundingBox())!
    expect(bounds.width).toBeGreaterThan(thumbnailWidth)
    await expect(image).toHaveCSS('object-fit', 'contain')
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height)
    await viewer.getByRole('button', { name: 'Cerrar imagen' }).click()
    await expect(viewer).toBeHidden()
  }
})

test('touching a capture keeps it open and touching the surrounding area closes it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = await openProjectImage(page)
  await trigger.click()
  const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
  await viewer.locator('img').click()
  await expect(viewer).toBeVisible()
  await page.mouse.click(4, 422)
  await expect(viewer).toBeHidden()
  await expect(trigger).not.toBeFocused()
  await expect(page.locator('.image-viewer-trigger:focus-visible')).toHaveCount(0)
})

test('Enter and Space open the viewer; Escape and the close button clear thumbnail focus', async ({
  page,
}) => {
  const trigger = await openProjectImage(page)
  await trigger.focus()
  await page.keyboard.press('Enter')
  const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
  const close = viewer.getByRole('button', { name: 'Cerrar imagen' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  // A native modal may pass Tab to browser chrome when it has only one control.
  expect(
    await page.evaluate(() => Boolean(document.activeElement?.closest('.portfolio-shell'))),
  ).toBe(false)
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page).toHaveURL(/#projects$/)
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()
  await expect(trigger).not.toBeFocused()
  await trigger.focus()
  await page.keyboard.press('Space')
  await expect(viewer).toBeVisible()
  await close.click()
  await expect(viewer).toBeHidden()
  await expect(trigger).not.toBeFocused()
  await expect(page.locator('.image-viewer-trigger:focus-visible')).toHaveCount(0)
})

test('changing the section closes an open capture', async ({ page }) => {
  const trigger = await openProjectImage(page)
  await trigger.click()
  const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
  await expect(viewer).toBeVisible()
  await page.evaluate(() => {
    window.location.hash = '#contact'
  })
  await expect(viewer).toBeHidden()
  await expect(page.locator('section[data-view="contact"]')).toBeVisible()
})

test.describe('mobile gallery focus', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('touch dismissal clears focus from both the thumbnail and its gallery panel', async ({
    page,
  }) => {
    const trigger = await openProjectImage(page)
    const panel = page.locator('#project-panel')
    const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
    await trigger.tap()
    await expect(viewer).toBeVisible()
    await page.touchscreen.tap(4, 320)
    await expect(viewer).toBeHidden()
    await expect(trigger).not.toBeFocused()
    await expect(panel).not.toBeFocused()

    // Safari may keep the enclosing panel focused when a button is tapped.
    // Open without moving that focus to reproduce its native restore target.
    await panel.focus()
    await trigger.dispatchEvent('click')
    await expect(viewer).toBeVisible()
    await viewer.getByRole('button', { name: 'Cerrar imagen' }).tap()
    await expect(viewer).toBeHidden()
    await expect(panel).not.toBeFocused()
    await expect(trigger).not.toBeFocused()
    await expect(
      page.locator('#project-panel:focus-visible,.image-viewer-trigger:focus-visible'),
    ).toHaveCount(0)
    if (process.env.CAPTURE_PREVIEW_SCREENSHOTS === '1')
      await page.screenshot({ path: 'screenshots/projects-mobile-preview.png' })
  })

  test('rotating an open mobile image uses the landscape viewport without cropping', async ({
    page,
  }) => {
    const trigger = await openProjectImage(page)
    await trigger.tap()
    const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
    await expect(viewer).toBeVisible()
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(viewer).toBeVisible()
    const image = viewer.locator('img')
    await image.evaluate((element) => (element as HTMLImageElement).decode())
    const bounds = (await image.boundingBox())!
    expect(bounds.height).toBeGreaterThanOrEqual(366)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(390)
    await expect(image).toHaveCSS('object-fit', 'contain')
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(viewer).toBeVisible()
    await viewer.getByRole('button', { name: 'Cerrar imagen' }).tap()
    await expect(viewer).toBeHidden()
  })
})

test('the personal portrait remains an image without an enlargement button', async ({ page }) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 400, height: 300 },
  ]) {
    await page.setViewportSize(size)
    await page.goto('./#home')
    await expect(page.locator('.intro-screen')).toBeHidden()
    const portrait = page.getByRole('img', { name: 'Retrato de Alejandro Téllez Corona' })
    await expect(portrait).toBeVisible()
    expect(await portrait.evaluate((image) => image.closest('button,a'))).toBeNull()
    await expect(page.getByRole('button', { name: /^Ampliar captura:/ })).toHaveCount(0)
    await portrait.click()
    await expect(page.locator('[data-image-viewer]')).toBeHidden()
  }
})
