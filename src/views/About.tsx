import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { copy } from '../data/copy'
import { Stepper, ViewHeading } from '../components/Shared'
import { useCompact } from '../components/useCompact'
import { TajamarLogo } from '../components/TajamarLogo'
import { CurrentEducationText } from '../components/CurrentEducationText'
import { usePanelTransition } from '../components/usePanelTransition'
import '../styles/about.css'

export function About() {
  const compact = useCompact()
  const [page, setPage] = useState(0)
  const reading = useRef<HTMLDivElement>(null)
  const direction = useRef(1)
  usePanelTransition(reading, page, { direction: direction.current })
  return (
    <section
      className={`view about-view${compact ? ' is-paged' : ''}`}
      data-view="about"
      aria-label={copy.nav.about}
    >
      <div className="about-content">
        <div className="about-left">
          <ViewHeading eyebrow={copy.about.eyebrow}>
            {!compact || page === 0 ? (
              <>
                {copy.about.title}
                <br />
                <em>{copy.about.accent}</em>
              </>
            ) : (
              copy.about.studying
            )}
          </ViewHeading>
          {(!compact || page === 0) && (
            <div className="about-story" ref={reading}>
              <p className="lead">{copy.about.intro}</p>
              <p>{copy.about.text}</p>
            </div>
          )}
        </div>
        {(!compact || page === 1) && (
          <div className="about-study" ref={reading}>
            {!compact && <h2 className="eyebrow">{copy.about.studying}</h2>}
            <TajamarLogo full />
            <p>
              <CurrentEducationText />
            </p>
            {!compact && (
              <a className="text-link about-link" href="#journey">
                {copy.about.journey}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
      {compact && (
        <div className="about-pagination">
          <span className="page-label">
            {page === 0 ? copy.about.shortIntro : copy.about.studying}
          </span>
          <Stepper
            index={page}
            count={2}
            onChange={(next, travel) => {
              direction.current = travel
              setPage(next)
            }}
            label={copy.about.pagination}
          />
        </div>
      )}
    </section>
  )
}
