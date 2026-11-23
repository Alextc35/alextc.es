import { test, expect, type Page } from '@playwright/test'

async function fits(page: Page) {
  const issues = await page.locator('main').evaluate((main) => {
    const bounds = main.getBoundingClientRect()
    return Array.from(main.querySelectorAll('h1,h2,p,a,button,img')).flatMap((element) => {
      if (
        !(element instanceof HTMLElement) ||
        !element.checkVisibility({ checkVisibilityCSS: true })
      )
        return []
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height || element.closest('.sr-only')) return []
      return rect.left < -1 ||
        rect.right > innerWidth + 1 ||
        rect.top < bounds.top - 1 ||
        rect.bottom > bounds.bottom + 1
        ? [element.textContent || element.getAttribute('alt')]
        : []
    })
  })
  expect(issues).toEqual([])
}

test('both projects remain available and Steam original SVGs, details and links fit every layout', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('./#projects')
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10000 })
    const selection = page.getByRole('group', { name: 'Seleccionar proyecto' })
    await selection.getByRole('button', { name: 'Steam Card API', exact: true }).click()
    await expect(selection.getByRole('button', { name: 'Steam Card API' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('.view-title')).toContainText('Steam Card API')
    await expect(page.locator('.browser-bar')).toContainText('steam-card-api')
    await expect(page.locator('main')).not.toContainText(
      /\bv\d+\.\d+\.\d+\b|Capturas reales del repositorio/,
    )
    await expect(page.locator('.repo-button')).toHaveAttribute(
      'href',
      'https://github.com/Alextc35/steam-card-api',
    )
    await expect(page.getByText('Explorar el proyecto', { exact: true })).toHaveCount(0)
    await expect(page.locator('.project-install')).toHaveCount(0)
    const image = page.locator('.project-image-surface img')
    await image.evaluate((element) => (element as HTMLImageElement).decode())
    await expect(image).toHaveAttribute('src', /steam-card-hero\.svg$/)
    await expect(image).toHaveCSS('object-fit', 'contain')
    await fits(page)
    if (viewport.width === 390 || viewport.width === 1440)
      await page.screenshot({ path: `screenshots/steam-card-${viewport.width}.png` })
    await page.getByRole('button', { name: 'Siguiente captura', exact: true }).click()
    await expect(image).toHaveAttribute('src', /steam-card-showcase\.svg$/)
    await image.evaluate((element) => (element as HTMLImageElement).decode())
    await page.locator('.project-image-surface .image-viewer-trigger').click()
    const dialog = page.getByRole('dialog', { name: 'Vista ampliada' })
    await expect(dialog).toBeVisible()
    await dialog.locator('img').evaluate((element) => (element as HTMLImageElement).decode())
    await dialog.getByRole('button', { name: 'Cerrar imagen', exact: true }).click()
    await page.getByRole('tab', { name: 'En detalle', exact: true }).click()
    const next = page
      .locator('.project-details')
      .getByRole('button', { name: 'Siguiente', exact: true })
    for (let index = 0; index < ((await next.count()) ? 4 : 1); index++) {
      await fits(page)
      if (await next.count()) await next.click()
    }
    await selection.getByRole('button', { name: 'New DeskTab', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'El proyecto', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(image).toHaveAttribute('src', /newdesktab-promo-poster\.jpg$/)
    await expect(
      page.getByRole('button', { name: 'Ver vídeo promocional de New DeskTab' }),
    ).toBeVisible()
    const mobile = await page.evaluate(
      () => matchMedia('(max-width: 800px), (pointer: coarse)').matches,
    )
    const install = page.getByRole('link', { name: /^Instalar extensión/ })
    if (mobile) {
      await expect(install).toHaveCount(0)
      const buttonBounds = (await page.locator('.repo-button').boundingBox())!
      const rowBounds = (await page.locator('.project-links').boundingBox())!
      expect(Math.abs(buttonBounds.width - rowBounds.width)).toBeLessThanOrEqual(1)
    } else {
      await expect(install).toBeVisible()
      await expect(install).toHaveAttribute(
        'href',
        'https://chromewebstore.google.com/detail/new-desktab/inafkeeciknpocbamagdmdnbbfmpdlmp',
      )
      await expect(install).toHaveAttribute('target', '_blank')
      await expect(install).toHaveAttribute('rel', 'noopener noreferrer')
    }
    await fits(page)
  }
})

test('the supplied avatar resolves as browser and Apple icons at their declared sizes', async ({
  page,
}) => {
  await page.goto('./')
  const icons = await page
    .locator('link[rel="icon"],link[rel="apple-touch-icon"]')
    .evaluateAll(async (links) =>
      Promise.all(
        links.map(async (link) => {
          const icon = new Image()
          icon.src = (link as HTMLLinkElement).href
          await icon.decode()
          return {
            size: link.getAttribute('sizes'),
            width: icon.naturalWidth,
            height: icon.naturalHeight,
            src: icon.src,
          }
        }),
      ),
    )
  expect(icons).toHaveLength(4)
  for (const [index, size] of [16, 32, 48, 180].entries()) {
    expect(icons[index].width).toBe(size)
    expect(icons[index].height).toBe(size)
    expect(icons[index].size).toBe(`${size}x${size}`)
    expect(icons[index].src).toContain('favicon-avatar')
  }
})
