import { test, expect, type Page } from '@playwright/test'

type Bounds = { left: number; top: number; right: number; bottom: number }

async function checkGallery(page: Page, source: RegExp, desktop: boolean) {
  const image = page.locator('.project-image-surface img')
  await expect(image).toHaveAttribute('src', source)
  await image.evaluate((element) => (element as HTMLImageElement).decode())

  const layout = await page.locator('main').evaluate((main) => {
    const bounds = (element: Element) => {
      const { left, top, right, bottom } = element.getBoundingClientRect()
      return { left, top, right, bottom }
    }
    const selectors = [
      '.project-copy h1',
      '.project-copy p',
      '.project-selector button',
      '.project-links a',
      '.showcase-top',
      '.project-figure',
      '.browser-bar',
      '.project-image-surface',
      '.project-image-surface > button',
      '.project-image-surface img',
      '.project-figure figcaption',
      '.image-controls',
      '.image-controls button',
    ]
    return {
      main: bounds(main),
      footer: bounds(document.querySelector('.site-footer')!),
      elements: selectors.flatMap((selector) =>
        Array.from(main.querySelectorAll<HTMLElement>(selector))
          .filter((element) => element.checkVisibility({ checkVisibilityCSS: true }))
          .map((element) => ({ selector, ...bounds(element) })),
      ),
      top: bounds(main.querySelector('.showcase-top')!),
      caption: bounds(main.querySelector('.project-figure figcaption')!),
      trigger: bounds(main.querySelector('.project-image-surface > button')!),
      image: bounds(main.querySelector('.project-image-surface img')!),
    }
  })

  for (const element of layout.elements) {
    expect(element.right - element.left, `${element.selector} has visible width`).toBeGreaterThan(0)
    expect(element.bottom - element.top, `${element.selector} has visible height`).toBeGreaterThan(
      0,
    )
    expect(element.left, `${element.selector} stays inside main`).toBeGreaterThanOrEqual(
      layout.main.left - 1,
    )
    expect(element.right, `${element.selector} stays inside main`).toBeLessThanOrEqual(
      layout.main.right + 1,
    )
    expect(element.top, `${element.selector} stays inside main`).toBeGreaterThanOrEqual(
      layout.main.top - 1,
    )
    expect(element.bottom, `${element.selector} stays inside main`).toBeLessThanOrEqual(
      layout.main.bottom + 1,
    )
    expect(element.bottom, `${element.selector} does not overlap the footer`).toBeLessThanOrEqual(
      layout.footer.top + 1,
    )
  }

  expect(layout.image.left).toBeGreaterThanOrEqual(layout.trigger.left - 1)
  expect(layout.image.top).toBeGreaterThanOrEqual(layout.trigger.top - 1)
  expect(layout.image.right).toBeLessThanOrEqual(layout.trigger.right + 1)
  expect(layout.image.bottom).toBeLessThanOrEqual(layout.trigger.bottom + 1)
  if (desktop && (await page.locator('.project-video-trigger').count()))
    await expect(image).toHaveCSS('object-fit', 'contain')

  return { top: layout.top, caption: layout.caption }
}

function expectStable(current: Bounds, initial: Bounds, label: string) {
  for (const edge of ['left', 'top', 'right', 'bottom'] as const)
    expect(
      Math.abs(current[edge] - initial[edge]),
      `${label} ${edge} stays stable`,
    ).toBeLessThanOrEqual(1)
}

for (const viewport of [
  { width: 1763, height: 874 },
  { width: 1920, height: 720 },
  { width: 1920, height: 621 },
  { width: 2560, height: 1080 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`project media fit and keep their controls stable at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('./#projects')
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    const desktop = viewport.width > 800 && viewport.height > 620
    const next = page.getByRole('button', { name: 'Siguiente captura', exact: true })
    const projects = [
      {
        name: 'New DeskTab',
        sources: [
          /newdesktab-promo-poster\.jpg$/,
          /newdesktab-workspace\.png$/,
          /newdesktab-folder\.png$/,
        ],
      },
      {
        name: 'Steam Card API',
        sources: [/steam-card-hero\.svg$/, /steam-card-showcase\.svg$/],
      },
    ]

    for (const project of projects) {
      await page
        .getByRole('group', { name: 'Seleccionar proyecto' })
        .getByRole('button', { name: project.name, exact: true })
        .click()
      const initial = await checkGallery(page, project.sources[0], desktop)
      for (const source of project.sources.slice(1)) {
        await next.click()
        const current = await checkGallery(page, source, desktop)
        expectStable(current.top, initial.top, 'Showcase heading')
        expectStable(current.caption, initial.caption, 'Media caption')
      }
      await next.click()
      const wrapped = await checkGallery(page, project.sources[0], desktop)
      expectStable(wrapped.top, initial.top, 'Showcase heading after wrapping')
      expectStable(wrapped.caption, initial.caption, 'Media caption after wrapping')
      await page.getByRole('tab', { name: 'En detalle', exact: true }).click()
      const clippedDetails = await page.locator('main').evaluate((main) => {
        const bounds = main.getBoundingClientRect()
        return Array.from(
          main.querySelectorAll<HTMLElement>('.project-details h2,.project-details p'),
        )
          .filter((element) => element.checkVisibility({ checkVisibilityCSS: true }))
          .flatMap((element) => {
            const rect = element.getBoundingClientRect()
            return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
              ? [element.textContent]
              : []
          })
      })
      expect(clippedDetails, 'Project details stay between the header and footer').toEqual([])
    }
  })
}
