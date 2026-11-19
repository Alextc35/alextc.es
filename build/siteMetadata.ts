import { copy } from '../src/data/copy.ts'
import { currentEducation, journey, profile, projects } from '../src/data/portfolio.ts'

export const siteTitle = `${profile.name} — Full Stack Developer`
export const siteDescription = `Portfolio de ${profile.name}: desarrollo Full Stack, arquitecturas Cloud y proyectos propios como ${projects.map((project) => project.name).join(' y ')}.`

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )
}

export function structuredData(siteUrl: string) {
  const personId = `${siteUrl}#person`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: profile.name,
        url: siteUrl,
        jobTitle: 'Desarrollador Full Stack',
        image: new URL(profile.portrait, siteUrl).href,
        sameAs: [profile.github, profile.linkedin],
        homeLocation: { '@type': 'Place', name: profile.location },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${siteUrl}#webpage`,
        url: siteUrl,
        name: siteTitle,
        description: siteDescription,
        inLanguage: 'es-ES',
        mainEntity: { '@id': personId },
        hasPart: projects.map((project) => ({
          '@type': 'SoftwareSourceCode',
          name: project.name,
          url: project.repository,
          codeRepository: project.repository,
          description: project.description,
          author: { '@id': personId },
          keywords: [project.category, ...project.technologies].join(', '),
          license: `${project.repository}/blob/main/LICENSE`,
        })),
      },
    ],
  }
}

export function robotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', siteUrl).href}\n`
}

export function sitemapXml(siteUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(siteUrl)}</loc></url></urlset>\n`
}

export function noScriptPortfolio(): string {
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
  const entries = (category: 'education' | 'experience') =>
    journey[category]
      .map(
        (entry) =>
          `<li><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.organization)} · ${escapeHtml(entry.period)}</p><p>${escapeHtml(entry.description)}</p></li>`,
      )
      .join('')
  return `<style>html,body{height:auto!important;overflow:auto!important}#root{display:none!important}.no-script-portfolio{max-width:760px;margin:auto;padding:32px 24px;font:16px/1.7 system-ui,sans-serif}.no-script-portfolio section{margin-top:32px}.no-script-portfolio h1{font-size:32px}.no-script-portfolio h2{font-size:24px}.no-script-portfolio h3{font-size:19px}.no-script-portfolio p{margin:12px 0}.no-script-portfolio li{margin:20px 0}.no-script-portfolio a{color:#bfd5a4;text-decoration:underline}.no-script-portfolio footer{margin-top:32px}</style>
    <main class="no-script-portfolio"><h1>${escapeHtml(profile.name)}</h1><p>${escapeHtml(profile.role)}</p>
    <section><h2>${escapeHtml(copy.nav.about)}</h2><p>${escapeHtml(copy.about.text)}</p><p>${escapeHtml(copy.about.extra.before)}${link(currentEducation.website!, copy.about.extra.school)}${escapeHtml(copy.about.extra.after)}</p></section>
    <section><h2>${escapeHtml(copy.nav.projects)}</h2>${projects.map((project) => `<article><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description)}</p>${link(project.repository, copy.projects.repo)}</article>`).join('')}</section>
    <section><h2>${escapeHtml(copy.nav.journey)}</h2><h3>${escapeHtml(copy.journey.categories.education)}</h3><ul>${entries('education')}</ul><h3>${escapeHtml(copy.journey.categories.experience)}</h3><ul>${entries('experience')}</ul></section>
    <section><h2>${escapeHtml(copy.nav.contact)}</h2><p><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></p><p>${link(profile.github, copy.all.github)} · ${link(profile.linkedin, copy.all.linkedin)}</p></section>
    <footer>© ${profile.copyrightYear} - ${escapeHtml(profile.handle)}</footer></main>`
}
