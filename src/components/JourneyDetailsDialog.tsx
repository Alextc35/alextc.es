import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BriefcaseBusiness, MapPin, UserRound, X } from 'lucide-react'
import { asset } from '../data/portfolio'
import type { JourneyCategory, JourneyEntry } from '../data/portfolio'
import { journeyDetails } from '../data/journeyDetails'
import { copy } from '../data/copy'
import '../styles/journey-details.css'

type JourneyDetailsDialogProps = {
  entry: JourneyEntry | null
  category: JourneyCategory
  onClose: () => void
}

export function JourneyDetailsDialog({ entry, category, onClose }: JourneyDetailsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const pointerDismissal = useRef(false)
  const backdropPointerDown = useRef(false)
  const cleanupFrame = useRef<number | null>(null)
  const latestOnClose = useRef(onClose)
  latestOnClose.current = onClose
  const titleId = useId()
  const summaryId = useId()
  const detail = entry ? journeyDetails[entry.id] : null
  const outsideCard = (x: number, y: number) => {
    const bounds = card.current?.getBoundingClientRect()
    return !!bounds && (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom)
  }

  const clearPointerFocus = useCallback(() => {
    if (!pointerDismissal.current) return
    const target = opener.current
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      (dialog.current?.contains(active) ||
        (target && (active === target || active.contains(target) || target.contains(active))))
    )
      active.blur()
  }, [])

  const requestClose = useCallback((pointer: boolean) => {
    pointerDismissal.current = pointer
    latestOnClose.current()
  }, [])

  useLayoutEffect(() => {
    const modal = dialog.current
    if (!modal) return
    if (entry) {
      if (cleanupFrame.current !== null) cancelAnimationFrame(cleanupFrame.current)
      pointerDismissal.current = false
      if (body.current) body.current.scrollTop = 0
      if (!modal.open) {
        const active = document.activeElement
        opener.current =
          active instanceof HTMLElement &&
          active !== document.body &&
          active !== document.documentElement
            ? active
            : null
        modal.showModal()
      }
    } else if (modal.open) {
      modal.close()
      clearPointerFocus()
      cleanupFrame.current = requestAnimationFrame(() => {
        clearPointerFocus()
        cleanupFrame.current = null
      })
    }
  }, [entry, clearPointerFocus])

  useEffect(() => {
    const hashChanged = () => requestClose(false)
    window.addEventListener('hashchange', hashChanged)
    const modal = dialog.current
    return () => {
      window.removeEventListener('hashchange', hashChanged)
      if (cleanupFrame.current !== null) cancelAnimationFrame(cleanupFrame.current)
      modal?.close()
    }
  }, [requestClose])

  return createPortal(
    <dialog
      ref={dialog}
      className="journey-details-dialog"
      data-journey-details
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      onCancel={(event) => {
        event.preventDefault()
        requestClose(false)
      }}
      onClose={clearPointerFocus}
      onPointerDown={(event) => {
        backdropPointerDown.current = outsideCard(event.clientX, event.clientY)
        if (backdropPointerDown.current) event.preventDefault()
      }}
      onPointerUp={(event) => {
        // Touch browsers may snap the later click into the scrollable card.
        // Use the actual press/release coordinates for the outside area.
        if (backdropPointerDown.current && outsideCard(event.clientX, event.clientY))
          requestClose(true)
        backdropPointerDown.current = false
      }}
      onPointerCancel={() => {
        backdropPointerDown.current = false
      }}
    >
      {entry && detail && (
        <div className="journey-details-card" ref={card}>
          <header className="journey-details-header">
            <div className="journey-details-identity">
              <div
                className={`journey-details-mark${entry.logo ? ' has-logo' : ''}${entry.logoShape === 'wordmark' ? ' is-wordmark' : ''}`}
              >
                {entry.logo ? (
                  <img
                    src={asset(entry.logo)}
                    alt={copy.journey.logo(entry.organization)}
                    width="56"
                    height="56"
                    decoding="async"
                  />
                ) : entry.organization === 'Autónomo' ? (
                  <UserRound size={25} aria-hidden="true" />
                ) : (
                  <BriefcaseBusiness size={25} aria-hidden="true" />
                )}
              </div>
              <div className="journey-details-organization">
                <p className="journey-details-category">{copy.journey.categories[category]}</p>
                <p>{entry.organization}</p>
              </div>
            </div>
            <h2 id={titleId} className="journey-details-title">
              {entry.title}
            </h2>
            <p className="journey-details-period">
              {entry.kind && (
                <span>
                  {entry.kind.replace('Ciclo Formativo de ', '').replace('Contrato de ', '')}
                  <span aria-hidden="true"> · </span>
                </span>
              )}
              {entry.period}
            </p>
            <button
              className="journey-details-close"
              type="button"
              aria-label={copy.journeyDetails.close}
              autoFocus
              onClick={(event) => requestClose(event.detail > 0)}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          <div className="journey-details-body" ref={body} tabIndex={0}>
            <p className="journey-details-summary" id={summaryId}>
              {detail.summary}
            </p>
            {detail.location && (
              <div className="journey-details-location">
                <MapPin size={16} aria-hidden="true" />
                <p>
                  <span>{copy.journeyDetails.location}</span>
                  {detail.location}
                </p>
              </div>
            )}
            {detail.sections.map((section) => (
              <section className="journey-details-section" key={section.title}>
                <h3>{section.title}</h3>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
            {detail.technologies.length > 0 && (
              <section className="journey-details-section">
                <h3>{copy.journeyDetails.tools}</h3>
                <ul className="journey-details-technologies">
                  {detail.technologies.map((technology) => (
                    <li key={technology}>{technology}</li>
                  ))}
                </ul>
              </section>
            )}
            <button
              className="journey-details-hint"
              type="button"
              onClick={(event) => requestClose(event.detail > 0)}
            >
              {copy.journeyDetails.hint}
            </button>
          </div>
        </div>
      )}
    </dialog>,
    document.body,
  )
}
