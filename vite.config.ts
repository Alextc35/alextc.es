import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  escapeHtml,
  noScriptPortfolio,
  robotsTxt,
  siteDescription,
  siteTitle,
  sitemapXml,
  structuredData,
} from './build/siteMetadata.ts'

function normalizeBase(value: string): string {
  const path = value.trim()
  if (
    /[?#\\]/.test(path) ||
    path.includes('://') ||
    path.split('/').some((part) => part === '.' || part === '..')
  ) {
    throw new Error(
      'VITE_BASE_PATH debe ser una ruta como / o /portfolio/, sin dominio, query ni segmentos relativos.',
    )
  }
  const clean = path.replace(/^\/+|\/+$/g, '')
  return clean ? `/${clean}/` : '/'
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const [owner, repository] = (env.GITHUB_REPOSITORY ?? '').split('/')
  const repositoryBase =
    repository && repository.toLowerCase() !== `${owner}.github.io`.toLowerCase()
      ? `/${repository}/`
      : '/'
  // An explicit empty value means root (configure-pages returns "" for user sites and custom domains).
  const base = normalizeBase(
    env.VITE_BASE_PATH ?? (env.GITHUB_ACTIONS === 'true' ? repositoryBase : '/'),
  )
  const fallbackUrl = owner ? `https://${owner}.github.io${base}` : 'https://alextc.es/'
  const destination = new URL(env.VITE_SITE_URL || fallbackUrl)
  if (
    !['https:', 'http:'].includes(destination.protocol) ||
    destination.username ||
    destination.password ||
    destination.search ||
    destination.hash
  ) {
    throw new Error(
      'VITE_SITE_URL debe ser una URL pública HTTP(S), sin credenciales, query ni fragmentos.',
    )
  }
  destination.pathname = normalizeBase(destination.pathname)
  if (destination.pathname !== base)
    throw new Error('La ruta de VITE_SITE_URL debe coincidir con VITE_BASE_PATH.')
  const siteUrl = destination.href

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'portfolio-metadata',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const pathname = request.url?.split('?')[0]
            if (pathname !== `${base}robots.txt` && pathname !== `${base}sitemap.xml`) return next()
            const sitemap = pathname.endsWith('sitemap.xml')
            response.setHeader(
              'Content-Type',
              sitemap ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8',
            )
            response.end(sitemap ? sitemapXml(siteUrl) : robotsTxt(siteUrl))
          })
        },
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(siteUrl) })
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(siteUrl) })
        },
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return {
              html: html
                .replaceAll('%VITE_SITE_URL%', escapeHtml(siteUrl))
                .replaceAll('%VITE_SITE_TITLE%', escapeHtml(siteTitle))
                .replaceAll('%VITE_SITE_DESCRIPTION%', escapeHtml(siteDescription))
                .replace('%PORTFOLIO_NOSCRIPT%', noScriptPortfolio()),
              tags: [
                { tag: 'meta', attrs: { name: 'portfolio-base', content: base }, injectTo: 'head' },
                {
                  tag: 'script',
                  attrs: { type: 'application/ld+json', id: 'portfolio-structured-data' },
                  children: JSON.stringify(structuredData(siteUrl)).replaceAll('<', '\\u003c'),
                  injectTo: 'head',
                },
              ],
            }
          },
        },
      },
    ],
    define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl) },
    build: { target: 'es2022' },
  }
})
