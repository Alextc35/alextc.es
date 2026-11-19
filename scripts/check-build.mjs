import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve('dist')
const html = await readFile(path.join(root, 'index.html'), 'utf8')
const base = html.match(/<meta\s+[^>]*name="portfolio-base"[^>]*content="([^"]*)"/i)?.[1]
if (!base) throw new Error('Falta portfolio-base en el HTML generado. Compila con vite.config.ts.')
const canonical = html.match(/<link\s+[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1]
const origin = canonical ? new URL(canonical).origin : undefined
const errors = []
const verified = new Set()

async function checkReference(reference, fromFile, { metadata = false } = {}) {
  if (!reference || /^(?:data:|blob:|mailto:|tel:|#)/i.test(reference)) return
  let value = reference.replaceAll('&amp;', '&').split(/[?#]/)[0]
  if (/^(?:https?:)?\/\//i.test(value)) {
    const url = new URL(value, canonical)
    if (!metadata || url.origin !== origin) return
    value = url.pathname
  }
  let local
  if (value.startsWith('/')) {
    if (!value.startsWith(base)) {
      errors.push(`${fromFile}: ${reference} escapa a la base ${base}`)
      return
    }
    local = path.resolve(root, decodeURIComponent(value.slice(base.length)))
  } else {
    local = path.resolve(path.dirname(fromFile), decodeURIComponent(value))
  }
  if (local !== root && !local.startsWith(`${root}${path.sep}`)) {
    errors.push(`${fromFile}: ${reference} escapa a dist/`)
    return
  }
  try {
    await access(local)
    verified.add(path.relative(root, local))
  } catch {
    errors.push(`${path.relative(root, fromFile)}: no existe ${reference}`)
  }
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  )
}

// Read complete CSS url() tokens. In particular, an SVG data URI may itself contain
// quoted attributes and url(#filter); that inner URL is part of the image, not an asset.
function* cssReferences(css) {
  let offset = 0
  const unescape = (value) =>
    value.replace(/\\(?:([\da-f]{1,6})\s?|([^\n\r\f])|\r?\n)/gi, (_, hex, char) => {
      if (hex) {
        const point = Number.parseInt(hex, 16)
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '\uFFFD'
      }
      return char ?? ''
    })
  function readQuoted() {
    const quote = css[offset++]
    let value = ''
    while (offset < css.length) {
      const char = css[offset++]
      if (char === quote) break
      value += char
      if (char === '\\' && offset < css.length) value += css[offset++]
    }
    return value
  }
  while (offset < css.length) {
    if (css.startsWith('/*', offset)) {
      const end = css.indexOf('*/', offset + 2)
      offset = end < 0 ? css.length : end + 2
    } else if (css[offset] === '"' || css[offset] === "'") {
      readQuoted()
    } else {
      const token = css.slice(offset).match(/^url\s*\(/i)
      if (!token || (offset > 0 && /[\w-]/.test(css[offset - 1]))) {
        offset++
        continue
      }
      offset += token[0].length
      while (/\s/.test(css[offset] ?? '') && offset < css.length) offset++
      let reference = ''
      if (css[offset] === '"' || css[offset] === "'") reference = readQuoted()
      else {
        while (offset < css.length && css[offset] !== ')') {
          const char = css[offset++]
          reference += char
          if (char === '\\' && offset < css.length) reference += css[offset++]
        }
      }
      while (/\s/.test(css[offset] ?? '') && offset < css.length) offset++
      if (css[offset] === ')') offset++
      yield unescape(reference.trim())
    }
  }
}

for (const match of html.matchAll(/<(?:script|img|source|link|meta)\b[^>]*>/gi)) {
  const tag = match[0]
  const attr = attributes(tag)
  if (attr.src) await checkReference(attr.src, path.join(root, 'index.html'))
  if (attr.srcset) {
    for (const item of attr.srcset.split(','))
      await checkReference(item.trim().split(/\s+/)[0], path.join(root, 'index.html'))
  }
  if (/^<link/i.test(tag) && attr.href && attr.rel !== 'canonical')
    await checkReference(attr.href, path.join(root, 'index.html'))
  if (
    /^<meta/i.test(tag) &&
    /^(?:og:image|twitter:image)$/.test(attr.property || attr.name || '')
  ) {
    await checkReference(attr.content, path.join(root, 'index.html'), { metadata: true })
  }
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await visit(file)
    else if (entry.name.endsWith('.css')) {
      const css = await readFile(file, 'utf8')
      for (const reference of cssReferences(css)) await checkReference(reference, file)
    }
  }
}
await visit(root)
if (/%(?:BASE_URL|VITE_[A-Z_]+|PORTFOLIO_NOSCRIPT)%/.test(html))
  errors.push('Quedan variables de compilación sin resolver en index.html.')
if (!canonical || !/^https?:\/\//.test(canonical)) errors.push('Falta una URL canónica HTTP(S).')
const description = [...html.matchAll(/<meta\b[^>]*>/gi)]
  .map((match) => attributes(match[0]))
  .find((attr) => attr.name === 'description')?.content
if (!description?.trim()) errors.push('Falta la descripción del portfolio.')
try {
  const match = html.match(
    /<script\b[^>]*id="portfolio-structured-data"[^>]*>([\s\S]*?)<\/script>/i,
  )
  const graph = match ? JSON.parse(match[1])['@graph'] : []
  if (!graph.some((entity) => entity['@type'] === 'Person' && entity.name))
    errors.push('Faltan datos estructurados de la persona.')
  if (!graph.some((entity) => entity['@type'] === 'ProfilePage' && entity.url === canonical))
    errors.push('Los datos estructurados no coinciden con la URL canónica.')
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8')
  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8')
  if (!robots.includes(`Sitemap: ${new URL('sitemap.xml', canonical).href}`))
    errors.push('robots.txt no enlaza el sitemap del destino.')
  if (!sitemap.includes(`<loc>${canonical}</loc>`) || /<loc>[^<]*#/.test(sitemap))
    errors.push('El sitemap debe contener la URL canónica sin fragmentos.')
} catch (error) {
  errors.push(`Metadatos de publicación inválidos: ${error.message}`)
}
if (!html.includes('class="no-script-portfolio"'))
  errors.push('Falta la alternativa accesible sin JavaScript.')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Build correcto: ${verified.size} recursos comprobados; base ${base}`)
}
