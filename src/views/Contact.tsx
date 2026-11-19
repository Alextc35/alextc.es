import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { Github, Linkedin } from '../components/BrandIcons'
import { profile } from '../data/portfolio'
import { copy } from '../data/copy'
import { ExternalLink, ViewHeading } from '../components/Shared'

export function Contact() {
  const [emailName, emailDomain] = profile.email.split('@')
  const githubHandle = profile.github.split('/').filter(Boolean).at(-1)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setStatus(copy.contact.copied)
    } catch {
      setStatus(copy.contact.failed)
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus(''), 4500)
  }
  return (
    <section className="view contact-view" data-view="contact" aria-label={copy.nav.contact}>
      <div className="contact-intro">
        <ViewHeading eyebrow={copy.contact.eyebrow}>
          {copy.contact.title}
          <br />
          <em>{copy.contact.accent}</em>
        </ViewHeading>
        <p className="section-intro">{copy.contact.intro}</p>
        <span className="contact-asterisk" aria-hidden="true">
          {copy.all.star}
        </span>
      </div>
      <div className="contact-links">
        <p className="eyebrow">{copy.contact.mail}</p>
        <div className="email-row">
          <a className="email-link" href={`mailto:${profile.email}`}>
            <span>
              {emailName}
              {copy.all.handlePrefix}
              <br />
              {emailDomain}
            </span>
            <ArrowUpRight strokeWidth={1} aria-hidden="true" />
          </a>
          <button className="copy-button" aria-label={copy.contact.copy} onClick={copyEmail}>
            {status === copy.contact.copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{status === copy.contact.copied ? copy.contact.copied : copy.contact.copy}</span>
          </button>
        </div>
        <p
          className={`copy-status${status === copy.contact.failed ? ' is-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
        <div className="contact-socials">
          <p className="eyebrow">{copy.contact.social}</p>
          <ExternalLink href={profile.github}>
            <Github size={18} aria-hidden="true" />
            <span>{copy.all.github}</span>
            <span className="social-handle">
              {copy.all.handlePrefix}
              {githubHandle}
            </span>
          </ExternalLink>
          <ExternalLink href={profile.linkedin}>
            <Linkedin size={18} aria-hidden="true" />
            <span>{copy.all.linkedin}</span>
            <span className="social-handle">{copy.contact.connect}</span>
          </ExternalLink>
        </div>
      </div>
    </section>
  )
}
