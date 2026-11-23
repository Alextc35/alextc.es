import { test, expect, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const sections = ['home', 'about', 'journey', 'projects', 'contact'] as const
const sizes = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 320, height: 480 },
  { width: 844, height: 390 },
  { width: 720, height: 450 },
  { width: 400, height: 300 },
  { width: 320, height: 300 },
]

type Anchor = { selector: string; x: number; y: number }
async function measureAnchors(page: Page, root: string, selectors: string[]): Promise<Anchor[]> {
  return page.locator(root).evaluate(
    (section, queries) =>
      queries.map((selector) => {
        const element = section.querySelector(selector)
        if (!element) throw new Error(`Missing layout anchor: ${selector}`)
        const rect = element.getBoundingClientRect()
        return { selector, x: rect.left, y: rect.top }
      }),
    selectors,
  )
}
function expectStableAnchors(current: Anchor[], baseline: Anchor[]) {
  current.forEach((position, index) => {
    expect
      .soft(
        Math.abs(position.x - baseline[index].x),
        `${position.selector} keeps its horizontal position`,
      )
      .toBeLessThanOrEqual(1)
    expect
      .soft(
        Math.abs(position.y - baseline[index].y),
        `${position.selector} keeps its vertical position`,
      )
      .toBeLessThanOrEqual(1)
  })
}

async function openSection(page: Page, id: (typeof sections)[number]) {
  await page.locator(`header nav a[href="#${id}"]`).click()
  await expect(page.locator(`header nav a[href="#${id}"]`)).toHaveAttribute('aria-current', 'page')
  await expect(page.locator(`section[data-view="${id}"]`)).toBeVisible()
  // Wait for finite view transitions before measuring; reduced-motion is enabled.
  await page.waitForFunction(
    () =>
      !document.getAnimations().some((animation) => {
        const timing = animation.effect?.getComputedTiming()
        return animation.playState === 'running' && timing?.iterations !== Infinity
      }),
  )
}

async function assertViewportContent(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const documentSize = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  }))
  expect
    .soft(documentSize.scrollWidth, 'No horizontal document scroll')
    .toBeLessThanOrEqual(documentSize.width + 1)
  expect
    .soft(documentSize.scrollHeight, 'No vertical document scroll')
    .toBeLessThanOrEqual(documentSize.height + 1)

  const clipped = await page.locator('main').evaluate((main) => {
    const issues: string[] = []
    const viewport = { width: innerWidth, height: innerHeight }
    const contentBounds = main.getBoundingClientRect()
    for (const element of main.querySelectorAll('h1,h2,h3,p,a,button,img,[role="tab"]')) {
      if (!(element instanceof HTMLElement)) continue
      if (element.closest('[aria-hidden="true"]')) continue
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) continue
      const label = `${element.tagName} ${(element.textContent || element.getAttribute('alt') || element.getAttribute('aria-label') || '').trim().slice(0, 70)}`
      if (
        rect.left < -1 ||
        rect.top < -1 ||
        rect.right > viewport.width + 1 ||
        rect.bottom > viewport.height + 1
      ) {
        issues.push(`${label}: outside viewport ${JSON.stringify(rect.toJSON())}`)
      }
      // Main reserves header/footer space. Optical type alignment and the rotated
      // portrait may enter the horizontal gutter, but must stay in the viewport.
      if (rect.top < contentBounds.top - 1 || rect.bottom > contentBounds.bottom + 1) {
        issues.push(`${label}: outside main ${JSON.stringify(rect.toJSON())}`)
      }
      let ancestor = element.parentElement
      while (ancestor && ancestor !== main.parentElement) {
        const style = getComputedStyle(ancestor)
        const bounds = ancestor.getBoundingClientRect()
        if (
          ['hidden', 'clip'].includes(style.overflowY) &&
          (rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1)
        ) {
          issues.push(`${label}: clipped vertically by ${ancestor.tagName}.${ancestor.className}`)
          break
        }
        if (
          ['hidden', 'clip'].includes(style.overflowX) &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
        ) {
          issues.push(`${label}: clipped horizontally by ${ancestor.tagName}.${ancestor.className}`)
          break
        }
        ancestor = ancestor.parentElement
      }
    }
    // A fixed-width wrapper can fit while an unbroken text node overflows it.
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
    let textNode: Node | null
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement
      const text = textNode.textContent?.trim()
      if (
        !text ||
        !(parent instanceof HTMLElement) ||
        parent.closest('[aria-hidden="true"],.sr-only')
      )
        continue
      if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const range = document.createRange()
      range.selectNodeContents(textNode)
      for (const rect of range.getClientRects()) {
        if (rect.width <= 0 || rect.height <= 0) continue
        if (
          rect.left < -1 ||
          rect.top < -1 ||
          rect.right > viewport.width + 1 ||
          rect.bottom > viewport.height + 1
        ) {
          issues.push(
            `TEXT ${text.slice(0, 70)}: outside viewport ${JSON.stringify(rect.toJSON())}`,
          )
        }
        if (rect.top < contentBounds.top - 1 || rect.bottom > contentBounds.bottom + 1) {
          issues.push(`TEXT ${text.slice(0, 70)}: outside main ${JSON.stringify(rect.toJSON())}`)
        }
      }
    }
    return issues
  })
  expect
    .soft(clipped, 'Essential visible content fits its viewport and clipping ancestors')
    .toEqual([])
}

for (const size of sizes) {
  test(`all views fit ${size.width} × ${size.height} without scrolling or clipped content`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.goto('./')
    for (const id of sections) {
      await openSection(page, id)
      await assertViewportContent(page)
      if (id === 'projects') {
        await expect(page.locator('.asset-credit')).toHaveCount(0)
        await expect(page.locator('main')).not.toContainText('Capturas reales del repositorio')
      }
      if (id === 'journey') {
        for (const category of ['Experiencia', 'Formación']) {
          await page.getByRole('tab', { name: category, exact: true }).click()
          await expect(page.locator('.journey-card')).toHaveCount(3)
          await expect(page.locator('section[data-view="journey"] .stepper')).toHaveCount(0)
          await assertViewportContent(page)
          const overflowingRows = await page.locator('.journey-card').evaluateAll((cards) =>
            cards.flatMap((card) => {
              const row = card.getBoundingClientRect()
              return Array.from(card.querySelectorAll('h2,p,img')).flatMap((element) => {
                if (!(element instanceof HTMLElement) || !element.checkVisibility()) return []
                const bounds = element.getBoundingClientRect()
                return bounds.bottom > row.bottom + 1
                  ? [`${element.textContent || element.getAttribute('alt')}: outside its row`]
                  : []
              })
            }),
          )
          expect.soft(overflowingRows, 'Each qualification stays inside its own row').toEqual([])
          if (process.env.CAPTURE_JOURNEY_SCREENSHOTS === '1' && size.width <= 400)
            await page.screenshot({
              path: `screenshots/journey-${category}-${size.width}x${size.height}.png`,
            })
        }
      }
      await expect(page.locator('main')).not.toContainText(/En curso|finalización prevista/i)
      if (id === 'home' && process.env.CAPTURE_HOME_SCREENSHOTS === '1') {
        await page
          .locator('section[data-view="home"] img')
          .evaluateAll((images) =>
            Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
          )
        await page.screenshot({ path: `screenshots/home-${size.width}x${size.height}.png` })
      }
    }
  })
}

test('view navigation, history and keyboard shortcuts remain usable', async ({ page }) => {
  await page.goto('./')
  await openSection(page, 'about')
  await expect(page.locator('section[data-view="about"] .view-title')).toBeFocused()
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page.locator('header nav a[href="#projects"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(page.locator('header nav a[href="#about"]')).toHaveAttribute('aria-current', 'page')
  await openSection(page, 'projects')
  await page.goBack()
  await expect(page.locator('header nav a[href="#about"]')).toHaveAttribute('aria-current', 'page')
  await page.keyboard.press('Tab')
  const focusVisible = await page.evaluate(() => document.activeElement?.matches(':focus-visible'))
  expect(focusVisible, 'Keyboard focus remains visibly indicated').toBe(true)
})

test('journey shows all three education and experience entries without pagination', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('./#journey')
  await page.getByRole('tab', { name: 'Experiencia', exact: true }).click()
  await expect(page.getByText('Autónomo', { exact: true })).toBeVisible()
  await expect(page.getByText('Enova-IT Solutions', { exact: true })).toBeVisible()
  await assertViewportContent(page)
  await expect(page.getByText('Sánchez Angulo, S. A.', { exact: true })).toBeVisible()
  for (const logo of await page.locator('.journey-card img').all())
    await logo.evaluate((image) => (image as HTMLImageElement).decode())
  await assertViewportContent(page)
  await expect(page.getByRole('tab', { name: 'Proyectos propios', exact: true })).toHaveCount(0)
  await expect(page.locator('section[data-view="journey"]')).not.toContainText(
    /Cada etapa|una nueva pieza/,
  )
  await page.getByRole('tab', { name: 'Formación', exact: true }).click()
  await expect(page.getByText('Tajamar · Madrid', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'IES Luis Braille · Coslada', exact: true }),
  ).toHaveCount(2)
  await expect(page.locator('main')).toContainText('SEP 2023 — JUN 2025')
  await expect(page.locator('main')).toContainText('Sistemas Microinformáticos y Redes')
  await expect(page.locator('main')).toContainText('SEP 2021 — JUN 2023')
  for (const logo of await page
    .getByRole('img', { name: 'Logo de IES Luis Braille · Coslada', exact: true })
    .all())
    await logo.evaluate((image) => (image as HTMLImageElement).decode())
  await expect(page.locator('.journey-card')).toHaveCount(3)
  await expect(page.locator('section[data-view="journey"] .stepper')).toHaveCount(0)
})

async function assertSimplifiedAbout(about: Locator) {
  await expect(about.locator('.focus-panel,.focus-options,.focus-detail,.tags')).toHaveCount(0)
  await expect(about.getByText(/^(Frontend|Backend|Cloud & automatización)$/)).toHaveCount(0)
}

async function assertFullTajamarLogo(about: Locator) {
  const logo = about.locator('img[src$="tajamar-logo.svg"]')
  await expect(logo).toHaveCount(1)
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('alt', /Tajamar/)
  await logo.evaluate(async (element) => {
    await (element as HTMLImageElement).decode()
  })
  expect(
    await logo.evaluate((element) => (element as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)
}

test('desktop About keeps the introduction and current education with the complete Tajamar logo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('./#about')
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  const about = page.locator('section[data-view="about"]')
  await expect(about.getByRole('heading', { level: 1, name: /La curiosidad/ })).toBeVisible()
  await expect(
    about.getByText('Me gusta construir cosas. Y entender por qué funcionan.', { exact: true }),
  ).toBeVisible()
  await expect(about.getByText(/^Soy Alejandro, desarrollador de software/)).toBeVisible()
  await expect(
    about
      .locator('.about-study')
      .getByRole('heading', { level: 2, name: 'Mi formación actual', exact: true }),
  ).toBeVisible()
  await expect(about).toContainText(
    /Actualmente curso el Máster.*Full Stack.*Arquitecturas Cloud.*Tajamar/,
  )
  await assertFullTajamarLogo(about)
  await assertSimplifiedAbout(about)
  await expect(about.locator('.step-count')).toHaveCount(0)
  await assertViewportContent(page)
  if (process.env.CAPTURE_ABOUT_SCREENSHOTS === '1')
    await page.screenshot({ path: 'screenshots/about-desktop.png' })
})

test('phone About has exactly introduction and education pages with stable navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#about')
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  const root = 'section[data-view="about"]'
  const about = page.locator(root)
  const counter = about.locator('.step-count')
  const anchors = ['.step-count', '.stepper button:first-of-type', '.stepper button:last-of-type']
  await expect(counter).toHaveText(/01\s*\/\s*02/)
  await expect(about.getByRole('heading', { level: 1, name: /La curiosidad/ })).toBeVisible()
  await expect(
    about.getByText('Me gusta construir cosas. Y entender por qué funcionan.', { exact: true }),
  ).toBeVisible()
  await expect(about.getByText(/^Soy Alejandro, desarrollador de software/)).toBeVisible()
  await expect(
    about.getByRole('heading', { name: 'Mi formación actual', exact: true }),
  ).toBeHidden()
  await assertSimplifiedAbout(about)
  const first = await measureAnchors(page, root, anchors)

  await about.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(counter).toHaveText(/02\s*\/\s*02/)
  await expect(
    about.getByRole('heading', { level: 1, name: 'Mi formación actual', exact: true }),
  ).toBeVisible()
  await expect(about).toContainText(
    /Actualmente curso el Máster.*Full Stack.*Arquitecturas Cloud.*Tajamar/,
  )
  await assertFullTajamarLogo(about)
  await assertSimplifiedAbout(about)
  expectStableAnchors(await measureAnchors(page, root, anchors), first)
  await assertViewportContent(page)

  await about.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(counter).toHaveText(/01\s*\/\s*02/)
  await expect(about.getByRole('heading', { level: 1, name: /La curiosidad/ })).toBeVisible()
  expectStableAnchors(await measureAnchors(page, root, anchors), first)
  await about.getByRole('button', { name: 'Anterior', exact: true }).click()
  await expect(counter).toHaveText(/02\s*\/\s*02/)
  await assertFullTajamarLogo(about)
})

test('short About layouts keep three reading pages ending in current education and the full logo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 300 })
  await page.goto('./#about')
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  const root = 'section[data-view="about"]'
  const about = page.locator(root)
  const counter = about.locator('.step-count')
  const anchors = ['.step-count', '.stepper button:first-of-type', '.stepper button:last-of-type']
  await expect(counter).toHaveText(/01\s*\/\s*03/)
  await expect(
    about.getByText('Me gusta construir cosas. Y entender por qué funcionan.', { exact: true }),
  ).toBeVisible()
  await assertSimplifiedAbout(about)
  const first = await measureAnchors(page, root, anchors)

  await about.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(counter).toHaveText(/02\s*\/\s*03/)
  await expect(about.getByText(/^Soy Alejandro, desarrollador de software/)).toBeVisible()
  await assertSimplifiedAbout(about)
  expectStableAnchors(await measureAnchors(page, root, anchors), first)

  await about.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(counter).toHaveText(/03\s*\/\s*03/)
  await expect(
    about.getByRole('heading', { level: 1, name: 'Mi formación actual', exact: true }),
  ).toBeVisible()
  await expect(about).toContainText(
    /Actualmente curso el Máster.*Full Stack.*Arquitecturas Cloud.*Tajamar/,
  )
  await assertFullTajamarLogo(about)
  await assertSimplifiedAbout(about)
  expectStableAnchors(await measureAnchors(page, root, anchors), first)
  await assertViewportContent(page)

  await about.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(counter).toHaveText(/01\s*\/\s*03/)
  await expect(
    about.getByText('Me gusta construir cosas. Y entender por qué funcionan.', { exact: true }),
  ).toBeVisible()
})

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 720, height: 450 },
]) {
  test(`internal pages preserve readable content at ${size.width} × ${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.goto('./#about')
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
    const aboutPages = Number(
      (await page.locator('section[data-view="about"] .step-count').innerText())
        .split('/')
        .at(-1)
        ?.trim(),
    )
    expect(aboutPages, 'Every explicit About page can be visited').toBeGreaterThan(0)
    let anchors: { selector: string; x: number; y: number }[] | undefined
    for (let step = 0; step < aboutPages; step++) {
      await expect(page.locator('section[data-view="about"] h1')).toHaveCount(1)
      const openingHeading = page.getByRole('heading', {
        level: 1,
        name: /La curiosidad es el principio/,
      })
      if (step === 0) await expect(openingHeading).toBeVisible()
      else await expect(openingHeading).toHaveCount(0)
      await assertViewportContent(page)
      const positions = await page.locator('section[data-view="about"]').evaluate((section) =>
        [
          '.view-heading > .eyebrow',
          '.view-title',
          '.step-count',
          '.about-pagination button:first-of-type',
          '.about-pagination button:last-of-type',
        ].map((selector) => {
          const element = section.querySelector(selector)
          if (!element) throw new Error(`Missing About layout anchor: ${selector}`)
          const rect = element.getBoundingClientRect()
          return { selector, x: rect.left, y: rect.top }
        }),
      )
      if (!anchors) anchors = positions
      else
        positions.forEach((position, index) => {
          expect
            .soft(
              Math.abs(position.x - anchors![index].x),
              `${position.selector} keeps its horizontal position on page ${step + 1}`,
            )
            .toBeLessThanOrEqual(1)
          expect
            .soft(
              Math.abs(position.y - anchors![index].y),
              `${position.selector} keeps its vertical position on page ${step + 1}`,
            )
            .toBeLessThanOrEqual(1)
        })
      if (process.env.CAPTURE_ABOUT_SCREENSHOTS === '1' && size.width === 390)
        await page.screenshot({ path: `screenshots/about-page-${step + 1}.png` })
      if (test.info().errors.length) return
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    }
    await openSection(page, 'journey')
    const journeyAnchors = await measureAnchors(page, 'section[data-view="journey"]', [
      '.journey-label',
      '.segment-tabs',
      '.journey-card:nth-child(1) .organization-name',
      '.journey-card:nth-child(2) .organization-name',
      '.journey-card:nth-child(3) .organization-name',
    ])
    for (const category of ['Formación', 'Experiencia']) {
      await page.getByRole('tab', { name: category, exact: true }).click()
      await assertViewportContent(page)
      await expect(page.locator('.journey-card')).toHaveCount(3)
      expectStableAnchors(
        await measureAnchors(
          page,
          'section[data-view="journey"]',
          journeyAnchors.map((anchor) => anchor.selector),
        ),
        journeyAnchors,
      )
      for (const logo of await page.locator('.organization-avatar img').all())
        await logo.evaluate((image) => (image as HTMLImageElement).decode())
      if (process.env.CAPTURE_JOURNEY_SCREENSHOTS === '1')
        await page.screenshot({
          path: `screenshots/journey-${category}-${size.width}x${size.height}.png`,
        })
    }
    await openSection(page, 'projects')
    const galleryArrows = await page
      .getByRole('button', { name: 'Siguiente captura', exact: true })
      .boundingBox()
    for (let image = 0; image < 3; image++) {
      await page.getByRole('button', { name: 'Siguiente captura', exact: true }).click()
      const next = (await page
        .getByRole('button', { name: 'Siguiente captura', exact: true })
        .boundingBox())!
      expect
        .soft(Math.abs(next.y - galleryArrows!.y), 'Gallery arrows keep their vertical position')
        .toBeLessThanOrEqual(1)
    }
    await page.getByRole('tab', { name: 'En detalle', exact: true }).click()
    const projectAnchors = await measureAnchors(page, 'section[data-view="projects"]', [
      '.view-title',
      '.showcase-top',
      '.step-count',
      '.project-details button:first-of-type',
      '.project-details button:last-of-type',
    ])
    for (let step = 0; step < 4; step++) {
      await assertViewportContent(page)
      expectStableAnchors(
        await measureAnchors(
          page,
          'section[data-view="projects"]',
          projectAnchors.map((anchor) => anchor.selector),
        ),
        projectAnchors,
      )
      if (test.info().errors.length) return
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    }
  })
}

test('tab groups support arrows, Home, End and roving keyboard focus', async ({ page }) => {
  await page.goto('./#journey')
  const education = page.getByRole('tab', { name: 'Formación', exact: true })
  const experience = page.getByRole('tab', { name: 'Experiencia', exact: true })
  await education.focus()
  await page.keyboard.press('ArrowRight')
  await expect(experience).toBeFocused()
  await expect(experience).toHaveAttribute('aria-selected', 'true')
  await expect(education).toHaveAttribute('tabindex', '-1')
  await page.keyboard.press('End')
  await expect(experience).toBeFocused()
  await expect(experience).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(education).toBeFocused()
  await expect(education).toHaveAttribute('aria-selected', 'true')
  await openSection(page, 'projects')
  const overview = page.getByRole('tab', { name: 'El proyecto', exact: true })
  const details = page.getByRole('tab', { name: 'En detalle', exact: true })
  await overview.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(details).toBeFocused()
  await expect(details).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(overview).toBeFocused()
  await expect(overview).toHaveAttribute('aria-selected', 'true')
})

test('every explicit reading page fits the small viewport at high zoom', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 300 })
  await page.goto('./')
  for (const id of sections) {
    await openSection(page, id)
    if (id === 'journey') {
      for (const category of ['Formación', 'Experiencia']) {
        await page.getByRole('tab', { name: category, exact: true }).click()
        await expect(page.locator('.journey-card')).toHaveCount(3)
        await assertViewportContent(page)
      }
      continue
    }
    const counter = page.locator('section .step-count')
    const count = Number((await counter.innerText()).split('/').at(-1)?.trim())
    expect(count, `Reading pages are available in ${id}`).toBeGreaterThan(1)
    const readingAnchors = await measureAnchors(page, `section[data-view="${id}"]`, [
      '.eyebrow',
      '.view-title',
      '.step-count',
      '.stepper button:first-of-type',
      '.stepper button:last-of-type',
    ])
    for (let index = 0; index < count; index++) {
      await assertViewportContent(page)
      expectStableAnchors(
        await measureAnchors(
          page,
          `section[data-view="${id}"]`,
          readingAnchors.map((anchor) => anchor.selector),
        ),
        readingAnchors,
      )
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    }
    await expect(counter).toContainText('01')
  }
})

test('project showcase loads real images and functional destinations', async ({ page }) => {
  const failures: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().startsWith('http://127.0.0.1') && response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`)
  })
  await page.goto('./')
  for (const id of sections) await openSection(page, id)
  await openSection(page, 'projects')
  const image = page.locator('section[data-view="projects"] img').first()
  await expect(image).toBeVisible()
  await expect(image).toHaveJSProperty('complete', true)
  expect(await image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const originalSrc = await image.getAttribute('src')
  await page.getByRole('button', { name: 'Siguiente captura', exact: true }).click()
  await expect(image).not.toHaveAttribute('src', originalSrc!)
  await expect(
    page.locator('section[data-view="projects"] a[href="https://github.com/Alextc35/newdesktab"]'),
  ).toBeVisible()
  await openSection(page, 'contact')
  await expect(page.locator('a[href="mailto:alejandro@tellezcorona.es"]').first()).toBeVisible()
  await expect(
    page.locator('section[data-view="contact"] a[href="https://github.com/Alextc35"]'),
  ).toBeVisible()
  await expect(
    page.locator(
      'section[data-view="contact"] a[href="https://www.linkedin.com/in/alejandrotellezcorona/"]',
    ),
  ).toBeVisible()
  for (const link of await page.locator('a[target="_blank"]').all()) {
    expect(await link.getAttribute('rel')).toContain('noopener')
  }
  expect(failures, 'All requested local assets resolve').toEqual([])
  expect(errors, 'No uncaught browser exceptions').toEqual([])
})

test('copy email reports accessible success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('./#contact')
  await page.getByRole('button', { name: 'Copiar correo', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Correo copiado')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'alejandro@tellezcorona.es',
  )
})

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`WCAG AA automated checks at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('./')
    for (const id of sections) {
      await openSection(page, id)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect.soft(results.violations, `Accessibility violations in ${id}`).toEqual([])
    }
  })
}

test('reduced-motion preference disables continuous animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('section[data-view="home"]')).toBeVisible()
  await page.waitForTimeout(300)
  const infiniteAnimations = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getComputedTiming().iterations === Infinity,
        ).length,
  )
  expect(infiniteAnimations).toBe(0)
})

test('requested header and footer elements are removed and copyright is plain text', async ({
  page,
}) => {
  await page.goto('./')
  for (const id of sections) {
    await openSection(page, id)
    await expect(page.locator('.site-header')).not.toContainText(/\b2026\b/)
    await expect(page.getByText('Abierto a conversar', { exact: true })).toHaveCount(0)
    await expect(page.getByText(/HECHO CON CURIOSIDAD Y CÓDIGO/i)).toHaveCount(0)
    await expect(
      page.locator('.header-contact,.footer-center,.view-progress,.motion-toggle'),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /(?:Pausar|Activar) movimiento de fondo/ }),
    ).toHaveCount(0)
    const copyright = page.locator('footer .footer-signature')
    await expect(copyright).toContainText(/©\s*2026\s*-\s*@alextc35/)
    await expect(copyright).toHaveJSProperty('tagName', 'SPAN')
    await expect(page.locator('footer a')).toHaveCount(0)
  }
})

test('home presents the current Tajamar master and an explicit journey action', async ({
  page,
}) => {
  await page.goto('./')
  const home = page.locator('section[data-view="home"]')
  await expect(home).toContainText(/Tajamar/)
  await expect(home).toContainText(/Máster.*Full Stack.*Cloud/)
  const logo = home.getByRole('img', { name: 'Logo de Tajamar' })
  await expect(logo).toBeVisible()
  await logo.evaluate((image) => (image as HTMLImageElement).decode())
  await expect(
    home.getByText('Ahora, aprendiendo y construyendo en Tajamar.', { exact: true }),
  ).toHaveCount(0)
  await expect(home).toContainText(/Curiosidad constante, construcción incesante\.?/i)
  const journeyLink = home.getByRole('link', { name: 'Explorar trayectoria', exact: true })
  await expect(journeyLink).toHaveAttribute('href', '#journey')
  await journeyLink.click()
  await expect(page.locator('header nav a[href="#journey"]')).toHaveAttribute(
    'aria-current',
    'page',
  )
})

for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
]) {
  test(`navigation and active label indicator are centered at ${size.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.goto('./')
    await page.evaluate(() => document.fonts.ready)
    for (const id of sections) {
      await openSection(page, id)
      const positions = await page.locator('header nav').evaluate((nav) => {
        const active = nav.querySelector('a[aria-current="page"]')
        const label = active?.querySelector('span:not(.nav-number):not(.nav-active)')
        const indicator = active?.querySelector('.nav-active')
        if (!label || !indicator)
          throw new Error('Active navigation label and indicator are required')
        const navBox = nav.getBoundingClientRect()
        const labelBox = label.getBoundingClientRect()
        const indicatorBox = indicator.getBoundingClientRect()
        return {
          navCenter: (navBox.left + navBox.right) / 2,
          viewportCenter: innerWidth / 2,
          labelCenter: (labelBox.left + labelBox.right) / 2,
          indicatorCenter: (indicatorBox.left + indicatorBox.right) / 2,
        }
      })
      expect
        .soft(
          Math.abs(positions.navCenter - positions.viewportCenter),
          `Navigation is centered in ${id}`,
        )
        .toBeLessThanOrEqual(1)
      expect
        .soft(
          Math.abs(positions.labelCenter - positions.indicatorCenter),
          `Indicator is centered under the ${id} label`,
        )
        .toBeLessThanOrEqual(1)
    }
  })
}

test('reading text and social controls stay legible across desktop and phone layouts', async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size)
    await page.goto('./')
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.locator('.hero-title')).toHaveCSS('text-transform', 'uppercase')
    const signature = (await page.locator('.footer-signature').boundingBox())!
    expect
      .soft(
        Math.abs(signature.x + signature.width / 2 - size.width / 2),
        `Copyright is centred at ${size.width}px`,
      )
      .toBeLessThanOrEqual(1)
    const minimumBody = size.width > 800 ? 14 : 12
    const minimumNavigation = size.width > 800 ? 14 : 12
    const navMetrics = await page.locator('header nav a').evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect()
        return {
          size: Number.parseFloat(getComputedStyle(link).fontSize),
          left: rect.left,
          right: rect.right,
        }
      }),
    )
    expect
      .soft(
        Math.min(...navMetrics.map((link) => link.size)),
        `Navigation labels remain readable at ${size.width}px`,
      )
      .toBeGreaterThanOrEqual(minimumNavigation)
    for (const [index, link] of navMetrics.entries()) {
      expect
        .soft(
          link.left,
          `Navigation label ${index + 1} stays inside the viewport at ${size.width}px`,
        )
        .toBeGreaterThanOrEqual(-1)
      expect
        .soft(
          link.right,
          `Navigation label ${index + 1} stays inside the viewport at ${size.width}px`,
        )
        .toBeLessThanOrEqual(size.width + 1)
      if (index > 0)
        expect
          .soft(
            link.left - navMetrics[index - 1].right,
            `Navigation labels have visible separation at ${size.width}px`,
          )
          .toBeGreaterThanOrEqual(size.width <= 600 ? 7.5 : -1)
    }

    const socials = page.locator('.hero-socials .social-icon')
    await expect(socials).toHaveCount(2)
    for (const social of await socials.all()) {
      const box = await social.boundingBox()
      expect
        .soft(box?.width ?? 0, `Social link has a touch-sized width at ${size.width}px`)
        .toBeGreaterThanOrEqual(44)
      expect
        .soft(box?.height ?? 0, `Social link has a touch-sized height at ${size.width}px`)
        .toBeGreaterThanOrEqual(44)
      const icon = await social.locator('svg').first().boundingBox()
      expect
        .soft(icon?.width ?? 0, `Social brand icon is large enough at ${size.width}px`)
        .toBeGreaterThanOrEqual(22)
      expect
        .soft(icon?.height ?? 0, `Social brand icon is large enough at ${size.width}px`)
        .toBeGreaterThanOrEqual(22)
    }

    for (const id of sections) {
      await openSection(page, id)
      if (id === 'projects') {
        const details = page.getByRole('tab', { name: 'En detalle', exact: true })
        if (await details.count()) await details.click()
      }
      const sizes = await page
        .locator(
          'main .hero-intro,main .about-story p,main .about-study p,main .qualification-title,main .project-intro,main .project-detail-intro > p,main .feature p,main .contact-intro .section-intro,main .compact-content > p:not(.eyebrow):not(.compact-copy-status)',
        )
        .evaluateAll((paragraphs) =>
          paragraphs.flatMap((paragraph) => {
            if (
              !(paragraph instanceof HTMLElement) ||
              !paragraph.checkVisibility({ checkVisibilityCSS: true })
            )
              return []
            const style = getComputedStyle(paragraph)
            return [
              {
                text: paragraph.textContent?.trim().slice(0, 80),
                size: Number.parseFloat(style.fontSize),
              },
            ]
          }),
        )
      expect
        .soft(sizes.length, `Reading content is present in ${id} at ${size.width}px`)
        .toBeGreaterThan(0)
      for (const paragraph of sizes) {
        expect
          .soft(paragraph.size, `${id} at ${size.width}px: ${paragraph.text}`)
          .toBeGreaterThanOrEqual(minimumBody)
      }
    }
  }
})

test('mobile home places a larger non-interactive portrait to the right of the introduction and keeps education available', async ({
  page,
}) => {
  for (const size of [
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(size)
    await page.goto('./')
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
    const home = page.locator('section[data-view="home"]')
    const introduction = home.locator('.hero-intro')
    const portrait = home.locator('.portrait-frame img')
    await expect(introduction).toBeVisible()
    await expect(portrait).toBeVisible()
    await portrait.evaluate((image) => (image as HTMLImageElement).decode())
    const introBounds = (await introduction.boundingBox())!
    const portraitBounds = (await portrait.boundingBox())!
    expect
      .soft(portraitBounds.x, `Portrait is right of the copy at ${size.width}px`)
      .toBeGreaterThanOrEqual(introBounds.x + introBounds.width + 8)
    expect
      .soft(
        portraitBounds.y + portraitBounds.height,
        `Portrait sits alongside the copy at ${size.width}px`,
      )
      .toBeGreaterThan(introBounds.y)
    await expect(home.locator('.hero-title')).toHaveCSS('text-transform', 'uppercase')
    expect
      .soft(portraitBounds.width, `Portrait is substantial at ${size.width}px`)
      .toBeGreaterThanOrEqual(156)
    expect(await portrait.evaluate((image) => image.closest('button,a,[role="button"]'))).toBeNull()
    await portrait.click()
    await expect(page.getByRole('dialog', { name: 'Vista ampliada' })).toHaveCount(0)
    await assertViewportContent(page)
    if (process.env.CAPTURE_HOME_SCREENSHOTS === '1')
      await page.screenshot({ path: `screenshots/home-${size.width}x${size.height}.png` })
    for (const social of await home.locator('.hero-socials .social-icon').all()) {
      const bounds = (await social.boundingBox())!
      expect.soft(bounds.width).toBeGreaterThanOrEqual(44)
      expect.soft(bounds.height).toBeGreaterThanOrEqual(44)
    }
    const homeAnchors = await measureAnchors(page, 'section[data-view="home"]', [
      '.eyebrow',
      'h1',
      '.step-count',
      '.mobile-home-pagination button:first-of-type',
      '.mobile-home-pagination button:last-of-type',
    ])
    await home.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(home).toContainText(/Tajamar/)
    await expect(home).toContainText(/Máster.*Full Stack.*Cloud/)
    const logo = home.getByRole('img', { name: 'Logo de Tajamar' })
    await expect(logo).toBeVisible()
    await logo.evaluate((image) => (image as HTMLImageElement).decode())
    await expect(home).not.toContainText(/En curso|finalización prevista/i)
    expectStableAnchors(
      await measureAnchors(
        page,
        'section[data-view="home"]',
        homeAnchors.map((anchor) => anchor.selector),
      ),
      homeAnchors,
    )
    const journey = home.getByRole('link', { name: 'Explorar trayectoria', exact: true })
    await expect(journey).toBeVisible()
    await expect(journey).toHaveAttribute('href', '#journey')
    await assertViewportContent(page)
    if (process.env.CAPTURE_HOME_SCREENSHOTS === '1')
      await page.screenshot({ path: `screenshots/study-${size.width}x${size.height}.png` })
  }
})
