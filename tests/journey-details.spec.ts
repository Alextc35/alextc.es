import { test, expect, type CDPSession, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function openJourney(page: Page) {
  await page.goto('./#journey')
  await expect(page.locator('.intro-screen')).toBeHidden()
  await expect(page.locator('section[data-view="journey"]')).toBeVisible()
  await expect(page.locator('.journey-card')).toHaveCount(3)
}

function cardFor(page: Page, title: string) {
  return page.locator('.journey-card').filter({ has: page.getByText(title, { exact: true }) })
}

async function openCard(page: Page, title: string) {
  const card = cardFor(page, title)
  await card.locator('.qualification-title').click()
  const dialog = page.locator('dialog[data-journey-details]')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible()
  return dialog
}

const master = 'Máster en Desarrollo Full Stack & Arquitecturas Cloud'
const daw = 'Desarrollo de Aplicaciones Web'
const closeName = 'Cerrar detalle'

test('all six qualifications and jobs open their own detailed information', async ({ page }) => {
  await openJourney(page)
  const groups = [
    {
      category: 'Formación',
      entries: [
        {
          title: master,
          organization: 'Tajamar · Madrid',
          sample: 'Cloud y automatización',
          technology: 'Power Automate',
        },
        {
          title: daw,
          organization: 'IES Luis Braille · Coslada',
          sample: '1º · Programación',
          technology: 'PL/SQL',
        },
        {
          title: 'Sistemas Microinformáticos y Redes',
          organization: 'IES Luis Braille · Coslada',
          sample: '2º · Sistemas operativos en red',
          technology: 'Active Directory',
        },
      ],
    },
    {
      category: 'Experiencia',
      entries: [
        {
          title: 'Desarrollador web e instructor de programación',
          organization: 'Autónomo',
          sample: 'Enseñanza de programación',
          technology: 'Scratch',
        },
        {
          title: 'Desarrollador de aplicaciones',
          organization: 'Enova-IT Solutions',
          sample: 'TPV multiplataforma',
          technology: 'CakePHP',
        },
        {
          title: 'Técnico informático',
          organization: 'Sánchez Angulo, S. A.',
          sample: 'Soporte remoto',
          technology: 'pfSense',
        },
      ],
    },
  ]
  for (const group of groups) {
    await page.getByRole('tab', { name: group.category, exact: true }).click()
    for (const entry of group.entries) {
      const dialog = await openCard(page, entry.title)
      await expect(dialog.locator('.journey-details-category')).toHaveText(group.category)
      await expect(dialog.locator('.journey-details-organization')).toContainText(
        entry.organization,
      )
      await expect(dialog.locator('.journey-details-summary')).not.toBeEmpty()
      await expect(dialog.getByRole('heading', { name: entry.sample, exact: true })).toHaveCount(1)
      await expect(dialog.locator('.journey-details-technologies')).toContainText(entry.technology)
      if (entry.title === master) {
        await page.screenshot({ path: 'screenshots/journey-details-desktop.png' })
        const accessibility = await new AxeBuilder({ page })
          .include('dialog[data-journey-details]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
        expect(accessibility.violations).toEqual([])
      }
      await dialog.getByRole('button', { name: closeName, exact: true }).click()
      await expect(dialog).toBeHidden()
    }
  }
})

test('clicking the content keeps the detail open; outside, Escape and section changes close it', async ({
  page,
}) => {
  await openJourney(page)
  let dialog = await openCard(page, master)
  await dialog.locator('.journey-details-summary').click()
  await expect(dialog).toBeVisible()
  await page.mouse.click(2, 450)
  await expect(dialog).toBeHidden()

  dialog = await openCard(page, master)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  dialog = await openCard(page, master)
  await page.evaluate(() => {
    window.location.hash = '#contact'
  })
  await expect(dialog).toBeHidden()
  await expect(page.locator('section[data-view="contact"]')).toBeVisible()
})

test('keyboard activation keeps the modal in control and restores the opener on dismissal', async ({
  page,
}) => {
  await openJourney(page)
  const trigger = cardFor(page, master).getByRole('button', { name: /^Ver detalles de / })
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.locator('dialog[data-journey-details]')
  const close = dialog.getByRole('button', { name: closeName, exact: true })
  await expect(dialog).toBeVisible()
  await expect(close).toBeFocused()
  await page.keyboard.press('Alt+ArrowRight')
  await expect(page).toHaveURL(/#journey$/)
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.keyboard.press('Space')
  await expect(dialog).toBeVisible()
  await close.focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

async function expectNoHorizontalOverflow(page: Page, dialog: Locator) {
  const issues = await dialog.evaluate((modal) => {
    const problems: string[] = []
    for (const element of [
      document.documentElement,
      document.body,
      modal,
      ...modal.querySelectorAll(
        '.journey-details-card,.journey-details-header,.journey-details-body',
      ),
    ]) {
      if (element.scrollWidth > element.clientWidth + 1)
        problems.push(`${element.tagName}.${element.className}: horizontal overflow`)
    }
    const walker = document.createTreeWalker(modal, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const bounds of range.getClientRects()) {
        if (bounds.left < -1 || bounds.right > innerWidth + 1)
          problems.push(`Text outside viewport: ${node.textContent.trim().slice(0, 50)}`)
      }
    }
    return problems
  })
  expect(issues).toEqual([])
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
}

test('long course details scroll inside the modal with a fixed close control at every phone size', async ({
  page,
}) => {
  for (const size of [
    { width: 375, height: 667 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 400, height: 300 },
  ]) {
    await page.setViewportSize(size)
    await openJourney(page)
    const dialog = await openCard(page, daw)
    await page.evaluate(() => document.fonts.ready)
    const card = (await dialog.locator('.journey-details-card').boundingBox())!
    const close = dialog.getByRole('button', { name: closeName, exact: true })
    const before = (await close.boundingBox())!
    expect(card.x).toBeGreaterThanOrEqual(0)
    expect(card.y).toBeGreaterThanOrEqual(0)
    expect(card.x + card.width).toBeLessThanOrEqual(size.width + 1)
    expect(card.y + card.height).toBeLessThanOrEqual(size.height + 1)
    expect(before.width).toBeGreaterThanOrEqual(44)
    expect(before.height).toBeGreaterThanOrEqual(44)
    expect(before.y).toBeGreaterThanOrEqual(0)
    expect(before.y + before.height).toBeLessThanOrEqual(size.height)
    const body = dialog.locator('.journey-details-body')
    const content = await body.evaluate((element) => ({
      client: element.clientHeight,
      scroll: element.scrollHeight,
    }))
    expect(content.client).toBeGreaterThan(30)
    expect(content.scroll).toBeGreaterThan(content.client)
    await expect(dialog.locator('.journey-details-summary')).toHaveCSS('user-select', 'text')
    if (size.width === 375)
      await page.screenshot({ path: 'screenshots/journey-details-mobile.png' })
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    const after = (await close.boundingBox())!
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1)
    await expectNoHorizontalOverflow(page, dialog)
    await close.click()
    await expect(dialog).toBeHidden()
  }
})

async function swipe(cdp: CDPSession, from: { x: number; y: number }, deltaX: number) {
  const point = (x: number) => [{ x, y: from.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x) })
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point(from.x + (deltaX * step) / 8),
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.describe('mobile journey details', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('touch dismissal clears focus from the row button and the restored Safari panel', async ({
    page,
  }) => {
    await openJourney(page)
    const card = cardFor(page, master)
    const trigger = card.getByRole('button', { name: /^Ver detalles de / })
    const panel = page.locator('#journey-panel')
    const dialog = page.locator('dialog[data-journey-details]')
    await card.locator('.qualification-title').tap()
    await expect(dialog).toBeVisible()
    await page.touchscreen.tap(2, 330)
    await expect(dialog).toBeHidden()
    await expect(trigger).not.toBeFocused()
    await expect(panel).not.toBeFocused()

    // Safari can retain focus on the enclosing tabpanel when a row is tapped.
    await panel.focus()
    await card.locator('.qualification-title').dispatchEvent('click', { detail: 1 })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: closeName, exact: true }).tap()
    await expect(dialog).toBeHidden()
    await expect(trigger).not.toBeFocused()
    await expect(panel).not.toBeFocused()
    await expect(
      page.locator('.journey-card-trigger:focus-visible,#journey-panel:focus-visible'),
    ).toHaveCount(0)
  })

  test('the footer close button is reachable after scrolling and preserves touch and keyboard focus behavior', async ({
    page,
  }) => {
    await openJourney(page)
    const card = cardFor(page, daw)
    const trigger = card.getByRole('button', { name: /^Ver detalles de / })
    const panel = page.locator('#journey-panel')
    const dialog = page.locator('dialog[data-journey-details]')
    const footerClose = dialog.getByRole('button', { name: 'Pulsa para cerrar', exact: true })

    await card.locator('.qualification-title').tap()
    await expect(dialog).toBeVisible()
    await dialog.locator('.journey-details-body').evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect(footerClose).toBeInViewport()
    expect((await footerClose.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await footerClose.tap()
    await expect(dialog).toBeHidden()
    await expect(trigger).not.toBeFocused()
    await expect(panel).not.toBeFocused()

    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await footerClose.focus()
    await expect(footerClose).toBeFocused()
    await expect(footerClose).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('swiping across readable row text navigates without opening a detail', async ({
    page,
    context,
  }) => {
    await openJourney(page)
    const cdp = await context.newCDPSession(page)
    const text = cardFor(page, master).locator('.qualification-title')
    const bounds = (await text.boundingBox())!
    await swipe(
      cdp,
      { x: Math.min(bounds.x + bounds.width - 12, 325), y: bounds.y + bounds.height / 2 },
      -150,
    )
    await expect(page).toHaveURL(/#contact$/)
    await expect(page.locator('section[data-view="contact"]')).toBeVisible()
    await expect(page.locator('dialog[data-journey-details]')).toBeHidden()

    await openJourney(page)
    const returnBounds = (await cardFor(page, master)
      .locator('.qualification-title')
      .boundingBox())!
    await swipe(cdp, { x: returnBounds.x + 12, y: returnBounds.y + returnBounds.height / 2 }, 150)
    await expect(page).toHaveURL(/#projects$/)
    await expect(page.locator('section[data-view="projects"]')).toBeVisible()
    await expect(page.locator('dialog[data-journey-details]')).toBeHidden()
  })
})
