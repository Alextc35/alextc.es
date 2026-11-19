import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { Stepper, ExternalLink } from '../components/Shared'
import { ZoomableImage } from '../components/ImageViewer'
import { TajamarLogo } from '../components/TajamarLogo'
import { CurrentEducationText } from '../components/CurrentEducationText'
import { ExtensionInstall } from '../components/ExtensionInstall'
import { usePanelTransition } from '../components/usePanelTransition'
import { asset, profile, projects, currentEducation } from '../data/portfolio'
import { copy } from '../data/copy'
import type { ViewId } from '../data/copy'
import '../styles/compact-pagination.css'

type Page = { eyebrow: string; title?: ReactNode; brand?: ReactNode; body: ReactNode }

// Explicit reading pages keep the whole portfolio available at high zoom levels.
export function CompactView({ view }: { view: Exclude<ViewId, 'journey'> }) {
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState('')
  const content = useRef<HTMLDivElement>(null)
  const direction = useRef(1)
  usePanelTransition(content, index, { direction: direction.current })
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(copy.contact.copied)
    } catch {
      setCopied(copy.contact.failed)
    }
  }
  const pages: Page[] =
    view === 'home'
      ? [
          {
            eyebrow: copy.home.eyebrow,
            title: (
              <>
                {profile.firstName.toLocaleUpperCase(copy.locale)}
                <br />
                {profile.lastName.toLocaleUpperCase(copy.locale)}
                <span className="accent">.</span>
              </>
            ),
            body: (
              <div className="compact-profile">
                <img
                  src={asset(profile.portrait)}
                  width="1254"
                  height="1254"
                  alt={copy.home.portrait}
                />
                <p className="hero-role">{profile.role}</p>
              </div>
            ),
          },
          {
            eyebrow: profile.name,
            title: copy.home.projects,
            body: (
              <>
                <p>{copy.home.intro}</p>
                <div className="compact-actions">
                  <a className="text-link" href="#projects">
                    {copy.nav.projects}
                    <ArrowRight size={14} />
                  </a>
                  <a className="text-link" href="#contact">
                    {copy.home.contact}
                  </a>
                  <ExternalLink href={profile.github} className="text-link">
                    {copy.all.github}
                  </ExternalLink>
                  <ExternalLink href={profile.linkedin} className="text-link">
                    {copy.all.linkedin}
                  </ExternalLink>
                </div>
              </>
            ),
          },
          {
            eyebrow: copy.home.studying,
            title: currentEducation.organization,
            body: (
              <>
                <div className="compact-study-body">
                  <TajamarLogo />
                  <p>{currentEducation.title}</p>
                </div>
                <div className="compact-actions">
                  <a className="text-link" href="#journey">
                    {copy.home.journey}
                    <ArrowRight size={14} />
                  </a>
                </div>
              </>
            ),
          },
          {
            eyebrow: copy.home.studying,
            title: currentEducation.organization,
            body: <p>{currentEducation.description}</p>,
          },
        ]
      : view === 'about'
        ? [
            {
              eyebrow: copy.about.eyebrow,
              title: (
                <>
                  {copy.about.title} <em>{copy.about.accent}</em>
                </>
              ),
              body: <p>{copy.about.intro}</p>,
            },
            { eyebrow: copy.nav.about, title: profile.firstName, body: <p>{copy.about.text}</p> },
            {
              eyebrow: copy.about.eyebrow,
              title: copy.about.studying,
              brand: <TajamarLogo full />,
              body: (
                <p>
                  <CurrentEducationText />
                </p>
              ),
            },
          ]
        : view === 'projects'
          ? [
              ...projects.flatMap((item) => [
                {
                  eyebrow: copy.nav.projects,
                  title: item.name,
                  body: (
                    <>
                      <p>
                        {item.summary} {item.description}
                      </p>
                      <div className="compact-actions">
                        <ExternalLink href={item.repository} className="text-link compact-repo">
                          {copy.projects.repo}
                        </ExternalLink>
                      </div>
                    </>
                  ),
                },
                ...item.images.map((img) => ({
                  eyebrow: copy.projects.image,
                  title: item.name,
                  body: (
                    <ZoomableImage
                      className="compact-image"
                      src={asset(img.src)}
                      width={img.width}
                      height={img.height}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  ),
                })),
                ...item.features.map((feature) => ({
                  eyebrow: item.name,
                  title: feature.title,
                  body: <p>{feature.text}</p>,
                })),
                {
                  eyebrow: item.name,
                  title: copy.projects.features,
                  body: (
                    <>
                      <div className="tags">
                        {item.technologies.map((tech) => (
                          <span key={tech}>{tech}</span>
                        ))}
                      </div>
                      <div className="compact-actions">
                        <ExternalLink href={item.repository} className="text-link compact-repo">
                          {copy.projects.repo}
                        </ExternalLink>
                        {item.id === 'newdesktab' && <ExtensionInstall href={item.storeUrl} />}
                      </div>
                    </>
                  ),
                },
              ]),
            ]
          : [
              {
                eyebrow: copy.contact.eyebrow,
                title: (
                  <>
                    {copy.contact.title} <em>{copy.contact.accent}</em>
                  </>
                ),
                body: (
                  <>
                    <p>{copy.contact.intro}</p>
                    <div className="compact-contact">
                      <a href={`mailto:${profile.email}`}>{profile.email}</a>
                      <button
                        className="icon-button"
                        aria-label={copy.contact.copy}
                        onClick={copyEmail}
                      >
                        {copied === copy.contact.copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p
                      className={`compact-copy-status${copied === copy.contact.failed ? ' is-error' : ''}`}
                      role="status"
                    >
                      {copied}
                    </p>
                  </>
                ),
              },
              {
                eyebrow: copy.contact.social,
                title: copy.nav.contact,
                body: (
                  <div className="compact-actions">
                    <ExternalLink href={profile.github} className="text-link">
                      {copy.all.github}
                    </ExternalLink>
                    <ExternalLink href={profile.linkedin} className="text-link">
                      {copy.all.linkedin}
                    </ExternalLink>
                  </div>
                ),
              },
            ]
  const page = pages[index] ?? pages[0]
  const heading = page.title && (
    <h1 className="view-title" tabIndex={-1}>
      {page.title}
    </h1>
  )
  return (
    <section className="view compact-view" data-view={view} aria-label={copy.nav[view]}>
      <div className="compact-content" ref={content} key={index} aria-live="polite">
        <p className="eyebrow">{page.eyebrow}</p>
        {page.brand ? (
          <div className="compact-about-heading">
            {heading}
            {page.brand}
          </div>
        ) : (
          heading
        )}
        {page.body}
      </div>
      <Stepper
        index={index}
        count={pages.length}
        onChange={(next, travel) => {
          direction.current = travel
          setIndex(next)
        }}
        label={`${copy.section}: ${copy.nav[view]}`}
      />
    </section>
  )
}
