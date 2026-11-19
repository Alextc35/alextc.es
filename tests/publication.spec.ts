import { test, expect } from '@playwright/test'

test('publication metadata, structured data, robots and sitemap use one canonical destination', async ({
  page,
  request,
}) => {
  await page.goto('./')
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical).toMatch(/^https?:\/\/[^?#]+\/$/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /New DeskTab.*Steam Card API/,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/)
  const graph = await page
    .locator('#portfolio-structured-data')
    .evaluate((element) => JSON.parse(element.textContent!)['@graph'])
  const person = graph.find((entity: Record<string, unknown>) => entity['@type'] === 'Person')
  const profile = graph.find((entity: Record<string, unknown>) => entity['@type'] === 'ProfilePage')
  expect(person.name).toBe('Alejandro Téllez Corona')
  expect(profile.url).toBe(canonical)
  expect(profile.mainEntity['@id']).toBe(person['@id'])
  expect(profile.hasPart.map((project: Record<string, unknown>) => project.name)).toEqual([
    'New DeskTab',
    'Steam Card API',
  ])
  const robots = await request.get('robots.txt')
  expect(robots.ok()).toBe(true)
  expect(await robots.text()).toContain(`Sitemap: ${new URL('sitemap.xml', canonical!).href}`)
  const sitemap = await request.get('sitemap.xml')
  expect(sitemap.ok()).toBe(true)
  expect(await sitemap.text()).toContain(`<loc>${canonical}</loc>`)
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(1)
})

test('without JavaScript the complete portfolio remains readable and its contact links work', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  try {
    const page = await context.newPage()
    await page.goto(baseURL!)
    const content = page.locator('.no-script-portfolio')
    await expect(content).toBeVisible()
    await expect(content.getByRole('heading', { level: 1 })).toHaveText('Alejandro Téllez Corona')
    await expect(content.getByRole('heading', { level: 2 })).toHaveText([
      'Sobre mí',
      'Proyectos',
      'Trayectoria',
      'Contacto',
    ])
    await expect(content.getByRole('link', { name: 'Ver repositorio', exact: true })).toHaveCount(2)
    const email = content.getByRole('link', { name: 'alejandro@tellezcorona.es', exact: true })
    await email.scrollIntoViewIfNeeded()
    await expect(email).toBeInViewport()
    await expect(email).toHaveAttribute('href', 'mailto:alejandro@tellezcorona.es')
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(
      true,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('[data-intro-screen]')).toHaveCount(0)
  } finally {
    await context.close()
  }
})
