import { ArrowRight, MoveUpRight } from 'lucide-react'
import { Github, Linkedin } from '../components/BrandIcons'
import { currentEducation, profile } from '../data/portfolio'
import { copy } from '../data/copy'
import { ExternalLink } from '../components/Shared'
import { HeroPortrait } from '../components/HeroPortrait'
import { TajamarLogo } from '../components/TajamarLogo'
import { usePhoneLayout } from '../components/useCompact'
import { MobileHome } from './MobileHome'
import { DeveloperLabel } from '../components/DeveloperLabel'

export function Home() {
  const phone = usePhoneLayout()
  const [developmentRole, architectureRole] = profile.role.split(' & ')
  if (phone) return <MobileHome />
  return (
    <section className="view home-view" data-view="home" aria-label={copy.home.label}>
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
        <p className="hero-role">
          {developmentRole} <span>{copy.all.ampersand}</span>
          <br className="role-break" /> {architectureRole}
        </p>
        <p className="hero-intro">{copy.home.intro}</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#projects">
            {copy.home.projects}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="text-link hero-contact" href="#contact">
            {copy.home.contact}
            <MoveUpRight size={15} aria-hidden="true" />
          </a>
          <div className="hero-socials">
            <ExternalLink href={profile.github} className="social-icon">
              <Github size={18} aria-hidden="true" />
              <span className="sr-only">{copy.all.github}</span>
            </ExternalLink>
            <ExternalLink href={profile.linkedin} className="social-icon">
              <Linkedin size={18} aria-hidden="true" />
              <span className="sr-only">{copy.all.linkedin}</span>
            </ExternalLink>
          </div>
        </div>
        <div className="hero-education">
          <div className="education-copy">
            <div className="education-identity">
              <TajamarLogo />
              <p className="education-label">
                {copy.home.studying}
                <span>{currentEducation.organization}</span>
              </p>
            </div>
            <p className="education-title">{currentEducation.title}</p>
          </div>
          <a className="button button-outline education-button" href="#journey">
            {copy.home.journey}
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <HeroPortrait />
      </div>
      <span className="hero-side-note" aria-hidden="true">
        {copy.home.note}
      </span>
    </section>
  )
}
