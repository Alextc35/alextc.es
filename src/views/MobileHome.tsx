import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Github, Linkedin } from '../components/BrandIcons'
import { HeroPortrait } from '../components/HeroPortrait'
import { TajamarLogo } from '../components/TajamarLogo'
import { DeveloperLabel } from '../components/DeveloperLabel'
import { ExternalLink, Stepper } from '../components/Shared'
import { usePanelTransition } from '../components/usePanelTransition'
import { copy } from '../data/copy'
import { currentEducation, profile } from '../data/portfolio'
import '../styles/mobile-home.css'

export function MobileHome() {
  const [page, setPage] = useState(0)
  const content = useRef<HTMLDivElement>(null)
  const direction = useRef(1)
  usePanelTransition(content, page, { direction: direction.current })
  return (
    <section
      className="view home-view mobile-home-view"
      data-view="home"
      aria-label={copy.home.label}
    >
      <div className="mobile-home-page" ref={content} aria-live="polite">
        {page === 0 ? (
          <div className="hero-copy">
            <DeveloperLabel />
            <h1 className="hero-title view-title" tabIndex={-1}>
              {profile.firstName}
              <br />
              <span>
                {profile.lastName}
                <span className="accent">{copy.all.dot}</span>
              </span>
            </h1>
            <div className="mobile-home-summary">
              <p className="hero-role">{profile.role}</p>
              <p className="hero-intro">{copy.home.intro}</p>
            </div>
            <HeroPortrait />
            <div className="hero-actions">
              <a className="button button-primary" href="#projects">
                {copy.home.projects}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <div className="hero-socials">
                <ExternalLink href={profile.github} className="social-icon">
                  <Github size={22} />
                  <span className="sr-only">{copy.all.github}</span>
                </ExternalLink>
                <ExternalLink href={profile.linkedin} className="social-icon">
                  <Linkedin size={22} />
                  <span className="sr-only">{copy.all.linkedin}</span>
                </ExternalLink>
              </div>
            </div>
          </div>
        ) : (
          <div className="mobile-home-study" aria-atomic="true">
            <p className="eyebrow">{copy.home.studying}</p>
            <div className="mobile-study-heading">
              <TajamarLogo />
              <h1 className="view-title" tabIndex={-1}>
                {currentEducation.organization}
              </h1>
            </div>
            <p className="education-title">{currentEducation.title}</p>
            <p className="education-description">{currentEducation.description}</p>
            <p className="mobile-study-period">{currentEducation.period}</p>
            <a className="button button-primary" href="#journey">
              {copy.home.journey}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className="text-link" href="#contact">
              {copy.home.contact}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
      <div className="mobile-home-pagination">
        <Stepper
          index={page}
          count={2}
          onChange={(next, travel) => {
            direction.current = travel
            setPage(next)
          }}
          label={copy.home.mobilePages}
        />
      </div>
    </section>
  )
}
