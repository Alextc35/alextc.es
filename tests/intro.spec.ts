import { test, expect, type Page } from '@playwright/test'

test.use({ reducedMotion: 'no-preference' })

const intro = (page: Page) => page.locator('[data-intro-screen]')
const shell = (page: Page) => page.locator('.portfolio-shell')
const portraitPath = '**/images/alejandro-tellez-corona.jpeg'

async function expectReady(page: Page) {
  await expect(intro(page), 'The entry screen releases the site within a bounded time').toHaveCount(
    0,
    { timeout: 10_000 },
  )
  await expect(shell(page)).toHaveJSProperty('inert', false)
  await expect(page.locator('html')).toHaveAttribute('data-portfolio-ready', '1')
}

test('the first entry reveals the portfolio and internal navigation does not replay it', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expect(intro(page)).toBeVisible()
  await expect(page.getByText('Cargando portfolio', { exact: true })).toBeAttached()
  await expect(shell(page)).toHaveJSProperty('inert', true)
  await expectReady(page)
  await expect(page.locator('section[data-view="home"]')).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('portfolio:intro-seen'))).toBe('1')
  await page.locator('header nav a[href="#about"]').click()
  await expect(page.locator('section[data-view="about"]')).toBeVisible()
  await expect(intro(page)).toHaveCount(0)
  await page.reload()
  await expectReady(page)
  await expect(page.locator('section[data-view="about"]')).toBeVisible()
  await expect(shell(page)).toHaveJSProperty('inert', false)
})

test('the entry can be skipped with the keyboard and does not replay', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  const enter = page.getByRole('button', { name: 'Entrar ahora', exact: true })
  await expect(enter).toBeVisible()
  await enter.focus()
  await page.keyboard.press('Enter')
  await expectReady(page)
  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(
      () => !!document.activeElement && !document.activeElement.closest('[inert]'),
    ),
  ).toBe(true)
  await page.reload()
  await expectReady(page)
})

test('Escape bypasses the entry screen', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expect(intro(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expectReady(page)
  await page.locator('header nav a[href="#projects"]').click()
  await expect(page.locator('section[data-view="projects"]')).toBeVisible()
})

test('reduced motion preserves the asset gate without replaying the animated introduction', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expectReady(page)
  await expect(shell(page)).toHaveJSProperty('inert', false)
  await page.locator('header nav a[href="#journey"]').click()
  await expect(page.locator('section[data-view="journey"]')).toBeVisible()
})

test('refresh keeps the portfolio covered until its web fonts are ready, even in a visited session', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expectReady(page)
  expect(await page.evaluate(() => sessionStorage.getItem('portfolio:intro-seen'))).toBe('1')

  let releaseFonts!: () => void
  const fontGate = new Promise<void>((resolve) => {
    releaseFonts = resolve
  })
  let heldFonts = 0
  await page.route('**/*.woff2', async (route) => {
    heldFonts++
    await fontGate
    await route.continue().catch(() => {})
  })
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect
      .poll(() => heldFonts, { message: 'Reload requests the actual locally served web fonts' })
      .toBeGreaterThan(0)
    await expect(intro(page)).toBeVisible()
    await expect(intro(page)).toHaveAttribute('data-intro-animated', 'false')
    await expect(shell(page)).toHaveJSProperty('inert', true)
    await page.waitForTimeout(250)
    await expect(
      intro(page),
      'An already-visited session still waits for delayed fonts',
    ).toBeVisible()
    await expect(shell(page)).toHaveJSProperty('inert', true)
    expect(
      await page.evaluate(() =>
        document.fonts.check('500 16px "Pixelify Sans Variable"', 'ÁáÉéÍíÓóÚúÑñ'),
      ),
    ).toBe(false)
    releaseFonts()
    await expectReady(page)
    const fontsReady = await page.evaluate(() => {
      const sample = 'AaÁáÉéÍíÓóÚúÑñ0123456789'
      return [
        '400 16px "JetBrains Mono Variable"',
        '500 16px "JetBrains Mono Variable"',
        '400 16px "Pixelify Sans Variable"',
        '500 16px "Pixelify Sans Variable"',
      ].every((font) => document.fonts.check(font, sample))
    })
    expect(
      fontsReady,
      'Every typography used by the portfolio is available when it is revealed',
    ).toBe(true)
    await expect(page.locator('section[data-view="home"]')).toBeVisible()
  } finally {
    releaseFonts()
  }
})

test('unavailable session storage does not prevent access', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage unavailable', 'SecurityError')
      },
    })
  })
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expectReady(page)
  await page.locator('header nav a[href="#contact"]').click()
  await expect(page.locator('section[data-view="contact"]')).toBeVisible()
  expect(errors).toEqual([])
})

test('an unavailable portrait does not leave the entry screen stuck', async ({ page }) => {
  await page.route(portraitPath, (route) => route.abort('failed'))
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expectReady(page)
  await page.locator('header nav a[href="#contact"]').click()
  await expect(page.locator('a[href="mailto:alejandro@tellezcorona.es"]').first()).toBeVisible()
})

test('a stalled portrait does not block the visitor indefinitely', async ({ page }) => {
  let releaseImage!: () => void
  const holdImage = new Promise<void>((resolve) => {
    releaseImage = resolve
  })
  await page.route(portraitPath, async (route) => {
    await holdImage
    await route.abort('failed').catch(() => {})
  })
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' })
    await expect(intro(page)).toBeVisible()
    await expectReady(page)
    await page.locator('header nav a[href="#about"]').click()
    await expect(page.locator('section[data-view="about"]')).toBeVisible()
  } finally {
    releaseImage()
  }
})

test('entry preloads and decodes every section image while preserving direct section links', async ({
  page,
}) => {
  const expectedPaths = [
    '/images/alejandro-tellez-corona.jpeg',
    '/images/tajamar-mark.svg',
    '/images/tajamar-logo.svg',
    '/images/luis-braille-mark.svg',
    '/images/enova-it-logo.png',
    '/images/sanchez-angulo-logo.png',
    '/images/newdesktab-workspace.png',
    '/images/newdesktab-folder.png',
    '/images/newdesktab-promo-poster.jpg',
    '/images/steam-card-hero.svg',
    '/images/steam-card-showcase.svg',
  ]
  const imageRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/images/')) imageRequests.push(new URL(request.url()).pathname)
  })
  await page.addInitScript(() => {
    const state = window as typeof window & { decodedImages: string[] }
    state.decodedImages = []
    const decode = HTMLImageElement.prototype.decode
    HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
      return decode.call(this).then(() => {
        state.decodedImages.push(new URL(this.src).pathname)
      })
    }
  })
  await page.goto('./#projects', { waitUntil: 'domcontentloaded' })
  await expectReady(page)
  expect(new URL(page.url()).hash).toBe('#projects')
  await expect(page.locator('header nav a[href="#projects"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.locator('section[data-view="projects"]')).toBeVisible()
  const decodedImages = await page.evaluate(
    () => (window as typeof window & { decodedImages: string[] }).decodedImages,
  )
  for (const path of expectedPaths) {
    expect(
      imageRequests.some((url) => url.endsWith(path)),
      `${path} is fetched before exploring another section`,
    ).toBe(true)
    expect(
      decodedImages.some((url) => url.endsWith(path)),
      `${path} is decoded before revealing the portfolio`,
    ).toBe(true)
  }
})

test('the initial gate waits for images belonging to an unvisited section', async ({ page }) => {
  let releaseImage!: () => void
  const imageGate = new Promise<void>((resolve) => {
    releaseImage = resolve
  })
  let heldImages = 0
  await page.route('**/images/enova-it-logo.png', async (route) => {
    heldImages++
    await imageGate
    await route.continue().catch(() => {})
  })
  try {
    await page.goto('./#home', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => heldImages).toBeGreaterThan(0)
    await page.waitForTimeout(800)
    await expect(
      intro(page),
      'A later-section image remains part of the initial asset gate',
    ).toBeVisible()
    await expect(shell(page)).toHaveJSProperty('inert', true)
    releaseImage()
    await expectReady(page)
    await page.locator('header nav a[href="#journey"]').click()
    await expect(page.locator('section[data-view="journey"]')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
  } finally {
    releaseImage()
  }
})

test('the entry fits a phone and reveals a usable mobile home', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expect(intro(page)).toBeVisible()
  const bounds = await intro(page).boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(-1)
  expect(bounds!.y).toBeGreaterThanOrEqual(-1)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845)
  await expectReady(page)
  await page.evaluate(() => document.fonts.ready)
  const portrait = page.locator('section[data-view="home"] img')
  await portrait.evaluate((img) => (img as HTMLImageElement).decode())
  await page
    .locator('section[data-view="home"]')
    .getByRole('button', { name: 'Siguiente', exact: true })
    .click()
  await expect(page.getByRole('link', { name: 'Explorar trayectoria', exact: true })).toBeVisible()
  const size = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }))
  expect(size.scrollWidth).toBeLessThanOrEqual(size.width)
  expect(size.scrollHeight).toBeLessThanOrEqual(size.height)
})

test.describe('mobile category navigation', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('rapid category taps keep content visible without replaying the entry screen', async ({
    page,
  }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' })
    await expectReady(page)
    await page.evaluate(() => {
      type Frame = { content: boolean; opacity: number; loader: boolean }
      const state = window as typeof window & {
        categoryFrames: Frame[]
        categoryFrame: number
        categoryLoaderEntries: number
        categoryObserver: MutationObserver
      }
      state.categoryFrames = []
      state.categoryLoaderEntries = 0
      state.categoryObserver = new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes) {
            if (
              node instanceof Element &&
              (node.matches('[data-intro-screen]') || node.querySelector('[data-intro-screen]'))
            )
              state.categoryLoaderEntries++
          }
      })
      state.categoryObserver.observe(document.body, { childList: true, subtree: true })
      const sample = () => {
        const stage = document.querySelector('main .view-stage')
        const section = stage?.querySelector('section[data-view]')
        const bounds = section?.getBoundingClientRect()
        let opacity = 1
        for (let element = stage; element; element = element.parentElement)
          opacity *= Number(getComputedStyle(element).opacity)
        state.categoryFrames.push({
          content:
            !!bounds && bounds.width > 0 && bounds.height > 0 && !!section?.textContent?.trim(),
          opacity,
          loader: !!document.querySelector('[data-intro-screen]'),
        })
        state.categoryFrame = requestAnimationFrame(sample)
      }
      sample()
    })
    for (const id of ['about', 'journey', 'projects', 'contact', 'home'])
      await page.locator(`header nav a[href="#${id}"]`).tap()
    await expect(page.locator('section[data-view="home"]')).toBeVisible()
    await page.waitForTimeout(100)
    const result = await page.evaluate(() => {
      const state = window as typeof window & {
        categoryFrames: { content: boolean; opacity: number; loader: boolean }[]
        categoryFrame: number
        categoryLoaderEntries: number
        categoryObserver: MutationObserver
      }
      cancelAnimationFrame(state.categoryFrame)
      state.categoryObserver.disconnect()
      return { frames: state.categoryFrames, loaderEntries: state.categoryLoaderEntries }
    })
    expect(result.frames.length).toBeGreaterThan(5)
    expect(
      result.loaderEntries,
      'The entry screen is never mounted again during mobile navigation',
    ).toBe(0)
    expect(
      result.frames.filter((frame) => !frame.content || frame.opacity < 0.99 || frame.loader),
      'Every rendered frame keeps visible content during category taps',
    ).toEqual([])
  })
})
