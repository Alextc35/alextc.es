import { defineConfig } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT || '5173'
const preview = process.env.PLAYWRIGHT_PREVIEW === '1'
const basePathSegment = (process.env.PLAYWRIGHT_BASE_PATH || '').trim().replace(/^\/+|\/+$/g, '')
const basePath = basePathSegment ? `/${basePathSegment}/` : '/'
const localUrl = `http://127.0.0.1:${port}${basePath}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || localUrl,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run ${preview ? 'preview' : 'dev'} -- --port ${port} --strictPort`,
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
})
