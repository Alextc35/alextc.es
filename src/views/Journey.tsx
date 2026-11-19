import { useCallback, useRef, useState } from 'react'
import { BriefcaseBusiness, UserRound } from 'lucide-react'
import { asset, journey } from '../data/portfolio'
import type { JourneyCategory, JourneyEntry } from '../data/portfolio'
import { copy } from '../data/copy'
import { Tabs } from '../components/Shared'
import { JourneyDetailsDialog } from '../components/JourneyDetailsDialog'
import { usePanelTransition } from '../components/usePanelTransition'
import '../styles/journey.css'

const categories: JourneyCategory[] = ['education', 'experience']

export function Journey() {
  const [category, setCategory] = useState<JourneyCategory>('education')
  const [selectedEntry, setSelectedEntry] = useState<JourneyEntry | null>(null)
  const closeDetails = useCallback(() => setSelectedEntry(null), [])
  const journeyList = useRef<HTMLDivElement>(null)
  usePanelTransition(journeyList, category, { direction: category === 'experience' ? 1 : -1 })
  const entries = journey[category]
  return (
    <>
      <section
        className="view journey-view journey-profile"
        data-view="journey"
        aria-label={copy.nav.journey}
      >
        <header className="journey-header">
          <h1 className="journey-label eyebrow view-title" tabIndex={-1}>
            {copy.journey.eyebrow}
          </h1>
          <Tabs
            options={categories.map((id) => ({ id, label: copy.journey.categories[id] }))}
            active={category}
            onChange={setCategory}
            label={copy.journey.categoryLabel}
            idPrefix="tab"
            panelId="journey-panel"
          />
        </header>
        <div
          id="journey-panel"
          className="journey-profile-panel"
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`tab-${category}`}
        >
          <div className="journey-list" ref={journeyList} role="list" aria-live="polite">
            {entries.map((entry) => (
              <article
                className="journey-card"
                role="listitem"
                key={entry.id}
                onClick={() => {
                  if (!window.getSelection()?.toString().trim()) setSelectedEntry(entry)
                }}
              >
                <button
                  type="button"
                  className="journey-card-trigger"
                  aria-haspopup="dialog"
                  aria-label={copy.journeyDetails.open(entry.title, entry.organization)}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedEntry(entry)
                  }}
                />
                <div className="journey-identity">
                  <div
                    className={`organization-avatar${entry.logo ? ' has-logo' : ''}${entry.logoShape === 'wordmark' ? ' is-wordmark' : ''}`}
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
                      <UserRound size={26} strokeWidth={1.4} aria-hidden="true" />
                    ) : (
                      <BriefcaseBusiness size={26} strokeWidth={1.4} aria-hidden="true" />
                    )}
                  </div>
                  <div className="journey-credentials">
                    <h2 className="organization-name">{entry.organization}</h2>
                    <p className="qualification-title">{entry.title}</p>
                    {entry.kind && (
                      <p className="qualification-kind">
                        {entry.kind.replace('Ciclo Formativo de ', '').replace('Contrato de ', '')}
                      </p>
                    )}
                    <p className="qualification-period">{entry.period}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <JourneyDetailsDialog entry={selectedEntry} category={category} onClose={closeDetails} />
    </>
  )
}
