import { test, expect, type CDPSession, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

type Point = { x: number; y: number; id?: number }

async function activeSection(page: Page, id: string) {
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.locator(`header nav a[href="#${id}"]`)).toHaveAttribute('aria-current', 'page')
  await expect(page.locator(`section[data-view="${id}"]`)).toBeVisible()
}

async function surfacePoint(page: Page): Promise<Point> {
  await expect(page.locator('[data-intro-screen]')).toHaveCount(0, { timeout: 10_000 })
  return page.locator('main#main-content').evaluate((main) => {
    const rect = main.getBoundingClientRect()
    // Use actual blank/non-interactive content, without touching page-edge history gestures.
    const controls = Array.from(
      main.querySelectorAll(
        'a,button,input,select,textarea,[role="tab"],[contenteditable="true"],[data-swipe-ignore]',
      ),
    ).map((control) => control.getBoundingClientRect())
    for (const y of [
      rect.bottom - 18,
      rect.bottom - 40,
      rect.bottom - 80,
      rect.bottom - 100,
      rect.y + rect.height * 0.8,
      rect.y + rect.height * 0.5,
    ]) {
      const x = Math.max(rect.x + 40, 85)
      const safe = [x, 300, 335].every((clientX) => {
        const target = document.elementFromPoint(clientX, y)
        // Touch hit-testing can snap a finger near a button onto it. Reserve
        // space around every control rather than relying on a mouse hit-test.
        return (
          target &&
          main.contains(target) &&
          !target.closest(
            'a,button,input,select,textarea,[role="tab"],[contenteditable="true"],[data-swipe-ignore]',
          ) &&
          controls.every(
            (control) =>
              clientX < control.left - 24 ||
              clientX > control.right + 24 ||
              y < control.top - 24 ||
              y > control.bottom + 24,
          )
        )
      })
      if (safe) return { x, y }
    }
    throw new Error('No non-interactive swipe surface is available')
  })
}

async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
  points: Point[],
) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, index) => ({
      ...point,
      id: point.id ?? index + 1,
      radiusX: 4,
      radiusY: 4,
      force: 1,
    })),
  })
}

async function swipe(
  cdp: CDPSession,
  from: Point,
  delta: Point,
  options: { cancel?: boolean; hold?: number } = {},
) {
  await touch(cdp, 'touchStart', [from])
  if (options.hold) await new Promise((resolve) => setTimeout(resolve, options.hold))
  for (let step = 1; step <= 8; step++) {
    await touch(cdp, 'touchMove', [
      { x: from.x + (delta.x * step) / 8, y: from.y + (delta.y * step) / 8 },
    ])
  }
  await touch(cdp, options.cancel ? 'touchCancel' : 'touchEnd', [])
}

async function remainsOn(page: Page, id: string) {
  // Let the final native event and any queued hash-change handler settle.
  await page.waitForTimeout(100)
  await activeSection(page, id)
}

test('touch swipes navigate left to next and right to previous', async ({ page, context }) => {
  await page.goto('./')
  await activeSection(page, 'home')
  const cdp = await context.newCDPSession(page)
  const start = { ...(await surfacePoint(page)), x: 300 }
  await swipe(cdp, start, { x: -205, y: 4 })
  await activeSection(page, 'about')
  await swipe(cdp, await surfacePoint(page), { x: 205, y: -3 })
  await activeSection(page, 'home')
})

test('one long swipe changes exactly one section and navigation wraps', async ({
  page,
  context,
}) => {
  await page.goto('./')
  const cdp = await context.newCDPSession(page)
  await swipe(cdp, { ...(await surfacePoint(page)), x: 335 }, { x: -280, y: 0 })
  await activeSection(page, 'about')
  await page.goto('./#contact')
  await activeSection(page, 'contact')
  await swipe(cdp, { ...(await surfacePoint(page)), x: 300 }, { x: -205, y: 0 })
  await activeSection(page, 'home')
  await swipe(cdp, await surfacePoint(page), { x: 205, y: 0 })
  await activeSection(page, 'contact')
})

test('short, vertical, diagonal, cancelled and held touches do not navigate', async ({
  page,
  context,
}) => {
  await page.goto('./')
  const cdp = await context.newCDPSession(page)
  const start = await surfacePoint(page)
  await swipe(cdp, start, { x: 24, y: 0 })
  await remainsOn(page, 'home')
  await swipe(cdp, { ...start, y: 450 }, { x: 8, y: 130 })
  await remainsOn(page, 'home')
  await swipe(cdp, { ...start, y: 450 }, { x: 100, y: 105 })
  await remainsOn(page, 'home')
  await swipe(cdp, start, { x: 205, y: 0 }, { cancel: true })
  await remainsOn(page, 'home')
  const heldStart = { ...start, x: 300 }
  await swipe(cdp, heldStart, { x: -205, y: 0 }, { hold: 900 })
  await remainsOn(page, 'home')
  await touch(cdp, 'touchStart', [heldStart])
  await touch(cdp, 'touchMove', [{ x: heldStart.x - 205, y: heldStart.y }])
  await page.waitForTimeout(420)
  await touch(cdp, 'touchEnd', [])
  await remainsOn(page, 'home')
})

test('multitouch and browser-edge gestures are not captured as navigation', async ({
  page,
  context,
}) => {
  await page.goto('./')
  const cdp = await context.newCDPSession(page)
  const start = await surfacePoint(page)
  await touch(cdp, 'touchStart', [{ x: 100, y: start.y, id: 1 }])
  await touch(cdp, 'touchStart', [
    { x: 100, y: start.y, id: 1 },
    { x: 200, y: start.y, id: 2 },
  ])
  await touch(cdp, 'touchMove', [
    { x: 45, y: start.y, id: 1 },
    { x: 330, y: start.y, id: 2 },
  ])
  await touch(cdp, 'touchEnd', [])
  await remainsOn(page, 'home')
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 })
  const homeUrl = page.url()
  await swipe(cdp, { x: 5, y: start.y }, { x: 155, y: 0 })
  await page.waitForTimeout(300)
  // A real edge gesture may invoke browser Back to its initial blank document.
  // Both native outcomes are valid; custom SPA navigation to #contact is not.
  expect([homeUrl, 'about:blank']).toContain(page.url())
  await page.goto(homeUrl)
  await activeSection(page, 'home')
  await swipe(cdp, { x: 385, y: start.y }, { x: -155, y: 0 })
  await remainsOn(page, 'home')
})

test('gestures starting on controls are ignored and controls still work', async ({
  page,
  context,
}) => {
  await page.goto('./#journey')
  await activeSection(page, 'journey')
  const cdp = await context.newCDPSession(page)
  const experience = page.getByRole('tab', { name: 'Experiencia', exact: true })
  const bounds = await experience.boundingBox()
  if (!bounds) throw new Error('Experience tab is not visible')
  await swipe(
    cdp,
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    { x: -170, y: 0 },
  )
  await remainsOn(page, 'journey')
  await experience.tap()
  await expect(page.getByText('Autónomo', { exact: true })).toBeVisible()
  await expect(page.getByText('Enova-IT Solutions', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Formación', exact: true }).tap()
  await expect(page.getByText('Tajamar · Madrid', { exact: true })).toBeVisible()
  await activeSection(page, 'journey')
})

test('mouse dragging does not trigger touch navigation', async ({ page }) => {
  await page.goto('./')
  const start = await surfacePoint(page)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 205, start.y, { steps: 8 })
  await page.mouse.up()
  await remainsOn(page, 'home')
})

test('touch arrows release their color and focus after changing content', async ({ page }) => {
  for (const id of ['home', 'about', 'projects']) {
    await page.goto(`./#${id}`)
    await activeSection(page, id)
    const arrow = page.getByRole('button', {
      name: id === 'projects' ? 'Siguiente captura' : 'Siguiente',
      exact: true,
    })
    const color = await arrow.evaluate((button) => getComputedStyle(button).backgroundColor)
    await arrow.tap()
    await expect(arrow).not.toBeFocused()
    await expect(arrow).toHaveCSS('background-color', color)
    await activeSection(page, id)
  }
  await page.getByRole('tab', { name: 'En detalle', exact: true }).tap()
  const arrow = page.getByRole('button', { name: 'Siguiente', exact: true })
  const color = await arrow.evaluate((button) => getComputedStyle(button).backgroundColor)
  await arrow.tap()
  await expect(arrow).not.toBeFocused()
  await expect(arrow).toHaveCSS('background-color', color)
  await arrow.focus()
  await page.keyboard.press('Enter')
  await expect(arrow).toBeFocused()
})

test('swiping the preview changes images while keeping the section and normal image taps', async ({
  page,
  context,
}) => {
  await page.goto('./#projects')
  await activeSection(page, 'projects')
  await page.getByRole('button', { name: 'Siguiente captura', exact: true }).tap()
  const cdp = await context.newCDPSession(page)
  const surface = page.locator('.project-image-surface')
  const bounds = (await surface.boundingBox())!
  const y = bounds.y + bounds.height / 2
  await expect(page.locator('.image-count')).toContainText('2 / 3')
  await swipe(cdp, { x: bounds.x + bounds.width - 40, y }, { x: -160, y: 3 })
  await expect(page.locator('.image-count')).toContainText('3 / 3')
  await activeSection(page, 'projects')
  const trigger = page.getByRole('button', { name: /^Ampliar captura:/ })
  await trigger.dispatchEvent('click', { detail: 1 })
  await expect(page.getByRole('dialog', { name: 'Vista ampliada' })).toBeHidden()
  await swipe(cdp, { x: bounds.x + 45, y }, { x: 160, y: -3 })
  await expect(page.locator('.image-count')).toContainText('2 / 3')
  await swipe(cdp, { x: bounds.x + 45, y }, { x: 5, y: 80 })
  await expect(page.locator('.image-count')).toContainText('2 / 3')
  await activeSection(page, 'projects')
  await trigger.tap()
  const viewer = page.getByRole('dialog', { name: 'Vista ampliada' })
  await expect(viewer).toBeVisible()
  await viewer.getByRole('button', { name: 'Cerrar imagen' }).tap()
  await expect(trigger).not.toBeFocused()
})

test('holding and selecting reading text leaves selection and native copy gestures intact', async ({
  page,
}) => {
  await page.goto('./')
  await activeSection(page, 'home')
  const selection = await page.locator('.hero-intro').evaluate(async (paragraph) => {
    const bounds = paragraph.getBoundingClientRect()
    const x = Math.min(bounds.right - 25, innerWidth - 30)
    const y = bounds.top + 10
    const makeTouch = (clientX: number) =>
      new Touch({
        identifier: 9,
        target: paragraph,
        clientX,
        clientY: y,
        pageX: clientX,
        pageY: y,
        screenX: clientX,
        screenY: y,
      })
    const startTouch = makeTouch(x)
    paragraph.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [startTouch],
        targetTouches: [startTouch],
        changedTouches: [startTouch],
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 380))
    const range = document.createRange()
    range.selectNodeContents(paragraph)
    const selected = window.getSelection()!
    selected.removeAllRanges()
    selected.addRange(range)
    const selectedText = selected.toString()
    const movedTouch = makeTouch(x - 120)
    const move = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [movedTouch],
      targetTouches: [movedTouch],
      changedTouches: [movedTouch],
    })
    paragraph.dispatchEvent(move)
    paragraph.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        targetTouches: [],
        changedTouches: [movedTouch],
      }),
    )
    return {
      selectedText,
      remainingText: selected.toString(),
      defaultPrevented: move.defaultPrevented,
      userSelect: getComputedStyle(paragraph).userSelect,
    }
  })
  expect(selection.selectedText.length).toBeGreaterThan(20)
  expect(selection.remainingText).toBe(selection.selectedText)
  expect(selection.defaultPrevented, 'A text-selection gesture is left to the browser').toBe(false)
  expect(selection.userSelect).toBe('text')
  await remainsOn(page, 'home')
})

test('mobile swipes keep content visible without replaying the loader when motion is enabled', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('./', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-intro-screen]')).toBeVisible()
  await activeSection(page, 'home')
  const cdp = await context.newCDPSession(page)
  for (const [destination, delta] of [
    ['about', -205],
    ['home', 205],
  ] as const) {
    const start = { ...(await surfacePoint(page)), x: delta < 0 ? 300 : 85 }
    await page.evaluate(() => {
      type Frame = { content: boolean; opacity: number; loader: boolean }
      const state = window as typeof window & { swipeFrames?: Frame[]; swipeFrameId?: number }
      state.swipeFrames = []
      const sample = () => {
        const section = document.querySelector('main section[data-view]')
        let opacity = 1
        for (
          let element = section;
          element && element.tagName !== 'MAIN';
          element = element.parentElement
        )
          opacity *= Number(getComputedStyle(element).opacity)
        const bounds = section?.getBoundingClientRect()
        state.swipeFrames!.push({
          content: !!bounds && bounds.width > 0 && bounds.height > 0,
          opacity,
          loader: !!document.querySelector('[data-intro-screen]'),
        })
        state.swipeFrameId = requestAnimationFrame(sample)
      }
      sample()
    })
    await swipe(cdp, start, { x: delta, y: 3 })
    await activeSection(page, destination)
    await page.waitForTimeout(100)
    const frames = await page.evaluate(() => {
      const state = window as typeof window & {
        swipeFrames?: { content: boolean; opacity: number; loader: boolean }[]
        swipeFrameId?: number
      }
      cancelAnimationFrame(state.swipeFrameId!)
      return state.swipeFrames!
    })
    expect(frames.length).toBeGreaterThan(2)
    expect(
      frames.filter((frame) => !frame.content || frame.opacity < 0.99 || frame.loader),
      'Every rendered frame keeps the page content visible during a mobile swipe',
    ).toEqual([])
  }
})
