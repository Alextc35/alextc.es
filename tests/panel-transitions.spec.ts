import { test, expect, type CDPSession, type Page } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'no-preference',
})

type Anchor = { selector: string; x: number; y: number }
type Frame = { content: boolean; opacity: number; loader: boolean; anchors: Anchor[] }
type MotionProbe = {
  active: boolean
  records: { animation: Animation; target: Element; moved: boolean }[]
  frames: Frame[]
  frameId: number
}
type ProbeWindow = typeof window & { panelMotionProbe: MotionProbe }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: MotionProbe = { active: false, records: [], frames: [], frameId: 0 }
    ;(window as ProbeWindow).panelMotionProbe = state
    const original = Element.prototype.animate
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options)
      if (state.active) state.records.push({ animation, target: this, moved: false })
      return animation
    }
  })
})

async function ready(page: Page) {
  await page.goto('./')
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.locator('section[data-view="home"]')).toBeVisible()
}

async function selectView(page: Page, view: string) {
  await page.locator(`header nav a[href="#${view}"]`).tap()
  await expect(page.locator(`section[data-view="${view}"]`)).toBeVisible()
  await settled(page)
}

async function settled(page: Page) {
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          (animation) =>
            animation.id === 'panel-transition' &&
            (animation.playState === 'running' || animation.pending),
        ),
  )
}

async function startCapture(page: Page, anchors: string[] = []) {
  await page.evaluate((queries) => {
    const state = (window as ProbeWindow).panelMotionProbe
    state.records = []
    state.frames = []
    state.active = true
    const sample = () => {
      const section = document.querySelector('main section[data-view]')
      const bounds = section?.getBoundingClientRect()
      let opacity = 1
      const panels = section
        ? [
            section,
            ...section.querySelectorAll(
              '.about-story,.about-study,.mobile-home-page,.journey-list,.showcase-panel,.project-detail-page,.project-image-surface,.project-details',
            ),
          ]
        : []
      for (const panel of panels) {
        let visibleOpacity = 1
        for (let element: Element | null = panel; element; element = element.parentElement)
          visibleOpacity *= Number(getComputedStyle(element).opacity)
        opacity = Math.min(opacity, visibleOpacity)
      }
      state.frames.push({
        content:
          !!bounds && bounds.width > 0 && bounds.height > 0 && !!section?.textContent?.trim(),
        opacity,
        loader: !!document.querySelector('[data-intro-screen]'),
        anchors: queries.map((selector) => {
          const element = document.querySelector(selector)
          if (!element) throw new Error(`Missing fixed anchor: ${selector}`)
          const rect = element.getBoundingClientRect()
          return { selector, x: rect.x, y: rect.y }
        }),
      })
      for (const record of state.records) {
        if (record.animation.id !== 'panel-transition' || !record.target.isConnected) continue
        const transform = getComputedStyle(record.target).transform
        if (transform !== 'none' && !new DOMMatrixReadOnly(transform).isIdentity)
          record.moved = true
      }
      state.frameId = requestAnimationFrame(sample)
    }
    sample()
  }, anchors)
}

async function finishCapture(page: Page, selector?: string) {
  if (selector)
    await page.waitForFunction(
      (query) =>
        (window as ProbeWindow).panelMotionProbe.records.some(
          (record) => record.animation.id === 'panel-transition' && record.target.matches(query),
        ),
      selector,
    )
  await settled(page)
  // Include the final rendered frame without depending on a fixed animation duration.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  const result = await page.evaluate((query) => {
    const state = (window as ProbeWindow).panelMotionProbe
    state.active = false
    cancelAnimationFrame(state.frameId)
    return {
      frames: state.frames,
      animations: state.records
        .filter((record) => record.animation.id === 'panel-transition')
        .map((record) => ({
          matches: !query || record.target.matches(query),
          moved: record.moved,
          playState: record.animation.playState,
          duration: record.animation.effect?.getComputedTiming().duration,
          iterations: record.animation.effect?.getComputedTiming().iterations,
          keyframes: (record.animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [],
        })),
    }
  }, selector)
  expect(result.frames.length).toBeGreaterThan(1)
  expect(
    result.frames.filter((frame) => !frame.content || frame.opacity < 0.999 || frame.loader),
    'Every rendered frame retains opaque content without replaying the loader',
  ).toEqual([])
  const baseline = result.frames[0].anchors
  for (const frame of result.frames)
    for (const [index, anchor] of frame.anchors.entries()) {
      expect(
        Math.abs(anchor.x - baseline[index].x),
        `${anchor.selector} stays fixed horizontally`,
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(anchor.y - baseline[index].y),
        `${anchor.selector} stays fixed vertically`,
      ).toBeLessThanOrEqual(1)
    }
  if (selector) {
    const animations = result.animations.filter((animation) => animation.matches)
    expect(animations.length, `${selector} uses a real panel animation`).toBeGreaterThan(0)
    expect(
      animations.some((animation) => animation.moved),
      `${selector} visibly translates`,
    ).toBe(true)
    for (const animation of animations) {
      expect(Number.isFinite(Number(animation.duration))).toBe(true)
      expect(Number(animation.duration)).toBeGreaterThan(0)
      expect(animation.iterations).toBe(1)
      const transforms = animation.keyframes.map((frame) => frame.transform).filter(Boolean)
      expect(transforms.length).toBeGreaterThanOrEqual(2)
      expect(transforms[0]).not.toEqual(transforms.at(-1))
      expect(
        animation.keyframes.every(
          (frame) => frame.opacity === undefined || Number(frame.opacity) === 1,
        ),
      ).toBe(true)
      expect(['finished', 'idle']).toContain(animation.playState)
    }
    const panel = page.locator(selector)
    expect(
      await panel.evaluate((element) => {
        const transform = getComputedStyle(element).transform
        return transform === 'none' || new DOMMatrixReadOnly(transform).isIdentity
      }),
      `${selector} finishes without an offset`,
    ).toBe(true)
  }
  return result
}

async function transition(
  page: Page,
  selector: string,
  action: () => Promise<unknown>,
  anchors: string[] = [],
) {
  await startCapture(page, anchors)
  await action()
  return finishCapture(page, selector)
}

async function swipeSurface(page: Page) {
  return page.locator('main').evaluate((main) => {
    const rect = main.getBoundingClientRect()
    const interactive =
      'a,button,input,select,textarea,[role="tab"],[contenteditable="true"],[data-swipe-ignore]'
    const controls = Array.from(main.querySelectorAll(interactive)).map((element) =>
      element.getBoundingClientRect(),
    )
    for (const y of [
      rect.bottom - 18,
      rect.bottom - 40,
      rect.bottom - 80,
      rect.y + rect.height * 0.8,
      rect.y + rect.height * 0.5,
    ]) {
      if (
        [95, 200, 300].every((x) => {
          const element = document.elementFromPoint(x, y)
          return (
            element &&
            main.contains(element) &&
            !element.closest(interactive) &&
            controls.every(
              (control) =>
                x < control.left - 24 ||
                x > control.right + 24 ||
                y < control.top - 24 ||
                y > control.bottom + 24,
            )
          )
        })
      )
        return { x: 300, y }
    }
    throw new Error('No non-interactive swipe surface is available')
  })
}

async function swipe(cdp: CDPSession, from: { x: number; y: number }) {
  const points = (x: number) => [{ x, y: from.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from.x) })
  for (let step = 1; step <= 8; step++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: points(from.x - (205 * step) / 8),
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test('mobile category taps and swipes animate continuously without a blank frame or loader', async ({
  page,
  context,
}) => {
  await ready(page)
  await transition(page, '.view-stage', () => page.locator('header nav a[href="#about"]').tap())
  await expect(page.locator('section[data-view="about"]')).toBeVisible()
  const cdp = await context.newCDPSession(page)
  const start = await swipeSurface(page)
  await transition(page, '.view-stage', () => swipe(cdp, start))
  await expect(page).toHaveURL(/#projects$/)
  await expect(page.locator('.project-figure')).toBeVisible()
})

test('Home and About animate their reading area while rapid replacement settles and fixed controls stay still', async ({
  page,
}) => {
  await ready(page)
  const homeNext = page
    .locator('.mobile-home-pagination')
    .getByRole('button', { name: 'Siguiente', exact: true })
  await transition(page, '.mobile-home-page', () => homeNext.tap())
  await expect(page.locator('.mobile-home-study')).toBeVisible()

  await startCapture(page)
  await page.evaluate(async () => {
    const next = document.querySelector<HTMLButtonElement>(
      '.mobile-home-pagination button[aria-label="Siguiente"]',
    )!
    next.click()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    next.click()
  })
  const rapid = await finishCapture(page, '.mobile-home-page')
  const replacements = rapid.animations.filter((animation) => animation.matches)
  expect(replacements).toHaveLength(2)
  expect(replacements[0].playState, 'The interrupted transition is canceled').toBe('idle')
  await expect(page.locator('.mobile-home-study')).toBeVisible()

  await selectView(page, 'about')
  const anchors = [
    '.about-view .view-heading > .eyebrow',
    '.about-view .view-title',
    '.about-pagination .stepper',
  ]
  await transition(
    page,
    '.about-study',
    () =>
      page
        .locator('.about-pagination')
        .getByRole('button', { name: 'Siguiente', exact: true })
        .tap(),
    anchors,
  )
  await expect(page.locator('.about-study')).toBeVisible()
})

test('Journey tabs, project tabs, project detail pages and gallery images share continuous panel motion', async ({
  page,
}) => {
  await ready(page)
  await selectView(page, 'journey')
  await transition(page, '.journey-list', () =>
    page.getByRole('tab', { name: 'Experiencia', exact: true }).tap(),
  )
  await expect(page.locator('.journey-card')).toHaveCount(3)
  await expect(page.getByText('Autónomo', { exact: true })).toBeVisible()

  await selectView(page, 'projects')
  await transition(page, '.project-image-surface', () =>
    page.getByRole('button', { name: 'Siguiente captura', exact: true }).tap(),
  )
  await expect(page.locator('.image-count')).toHaveText('2 / 2')
  await transition(page, '.showcase-panel', () =>
    page.getByRole('tab', { name: 'En detalle', exact: true }).tap(),
  )
  await transition(page, '.project-detail-page', () =>
    page.getByRole('button', { name: 'Siguiente', exact: true }).tap(),
  )
  await expect(
    page.getByRole('heading', { name: 'Organiza a tu manera', exact: true }),
  ).toBeVisible()
})

test('reduced motion changes every panel without starting panel animations or replaying loading', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ready(page)
  await startCapture(page)
  await page
    .locator('.mobile-home-pagination')
    .getByRole('button', { name: 'Siguiente', exact: true })
    .tap()
  await selectView(page, 'about')
  await page
    .locator('.about-pagination')
    .getByRole('button', { name: 'Siguiente', exact: true })
    .tap()
  await selectView(page, 'journey')
  await page.getByRole('tab', { name: 'Experiencia', exact: true }).tap()
  await selectView(page, 'projects')
  await page.getByRole('button', { name: 'Siguiente captura', exact: true }).tap()
  await page.getByRole('tab', { name: 'En detalle', exact: true }).tap()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).tap()
  await expect(
    page.getByRole('heading', { name: 'Organiza a tu manera', exact: true }),
  ).toBeVisible()
  const reduced = await finishCapture(page)
  expect(reduced.animations).toEqual([])
})
