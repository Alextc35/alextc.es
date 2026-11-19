import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Layers2 } from 'lucide-react'
import { Github } from '../components/BrandIcons'
import { ExtensionInstall } from '../components/ExtensionInstall'
import { ZoomableImage } from '../components/ImageViewer'
import { asset, projects } from '../data/portfolio'
import { copy } from '../data/copy'
import { ExternalLink, IconButton, Stepper, Tabs, ViewHeading } from '../components/Shared'
import { useCompact } from '../components/useCompact'
import { useImageSwipe } from '../components/useImageSwipe'
import { usePanelTransition } from '../components/usePanelTransition'
import '../styles/projects-pagination.css'

export function Projects() {
  const compact = useCompact()
  const [projectIndex, setProjectIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [imageDirection, setImageDirection] = useState(1)
  const [tab, setTab] = useState('overview')
  const [detailIndex, setDetailIndex] = useState(0)
  const project = projects[projectIndex]
  const imageSurface = useRef<HTMLDivElement>(null)
  const showcasePanel = useRef<HTMLDivElement>(null)
  const detailPage = useRef<HTMLDivElement>(null)
  const projectPreview = useRef<HTMLDivElement>(null)
  const projectName = useRef<HTMLSpanElement>(null)
  const projectDirection = useRef(1)
  const detailDirection = useRef(1)
  const moveImage = useCallback(
    (direction: number) => {
      setImageDirection(direction)
      setImageIndex((index) => (index + direction + project.images.length) % project.images.length)
    },
    [project.images.length],
  )
  useImageSwipe(imageSurface, moveImage, tab === 'overview')
  usePanelTransition(imageSurface, imageIndex, { direction: imageDirection })
  usePanelTransition(showcasePanel, tab, { direction: tab === 'details' ? 1 : -1 })
  usePanelTransition(detailPage, detailIndex, { direction: detailDirection.current })
  usePanelTransition(projectPreview, project.id, { direction: projectDirection.current })
  usePanelTransition(projectName, project.id, { direction: projectDirection.current })
  const currentImage = project.images[imageIndex] ?? project.images[0]
  const chooseProject = (index: number) => {
    projectDirection.current = Math.sign(index - projectIndex) || 1
    setProjectIndex(index)
    setImageIndex(0)
    setDetailIndex(0)
    setTab('overview')
  }
  return (
    <section
      className={`view projects-view${compact ? ' is-paged' : ''}`}
      data-view="projects"
      aria-label={copy.nav.projects}
    >
      <div className="project-copy">
        <ViewHeading eyebrow={copy.projects.eyebrow}>
          <span ref={projectName} className="project-name">
            {project.name}
          </span>
          <span className="project-tagline">
            <em>{project.summary}</em>
          </span>
        </ViewHeading>
        <div className="project-selector" role="group" aria-label={copy.projects.selection}>
          {projects.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={projectIndex === index}
              onClick={() => chooseProject(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="project-intro">{project.description}</p>
        <div className="project-links">
          <ExternalLink href={project.repository} className="button button-primary repo-button">
            <Github size={26} aria-hidden="true" />
            {copy.projects.repo}
          </ExternalLink>
          {project.id === 'newdesktab' && <ExtensionInstall href={project.storeUrl} />}
        </div>
        <p className="eyebrow project-personal">{copy.projects.personal}</p>
      </div>
      <div className="project-showcase" ref={projectPreview}>
        <div className="showcase-top">
          <span className="eyebrow">{copy.projects.ownProduct(projectIndex + 1)}</span>
          <Tabs
            options={[
              { id: 'overview', label: copy.projects.overview },
              { id: 'details', label: copy.projects.features },
            ]}
            active={tab}
            onChange={setTab}
            label={copy.projects.information}
            idPrefix="project-tab"
            panelId="project-panel"
          />
        </div>
        <div
          id="project-panel"
          ref={showcasePanel}
          className={`showcase-panel ${tab === 'details' ? 'is-details' : ''}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`project-tab-${tab}`}
        >
          {tab === 'overview' ? (
            <figure
              className={`project-figure${project.previewFit === 'contain' ? ' is-card-preview' : ''}`}
            >
              <div className="browser-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <div>{project.previewLabel}</div>
                <Layers2 size={12} />
              </div>
              <div className="project-image-surface" ref={imageSurface} data-swipe-ignore>
                <ZoomableImage
                  key={currentImage.src}
                  src={asset(currentImage.src)}
                  alt={currentImage.alt}
                  width={currentImage.width}
                  height={currentImage.height}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </div>
              <figcaption>
                <span>{currentImage.caption}</span>
                <div className="image-controls">
                  <IconButton aria-label={copy.projects.prevImage} onClick={() => moveImage(-1)}>
                    <ArrowLeft size={16} />
                  </IconButton>
                  <span className="image-count" aria-live="polite">
                    {imageIndex + 1} {copy.all.separator} {project.images.length}
                  </span>
                  <IconButton aria-label={copy.projects.nextImage} onClick={() => moveImage(1)}>
                    <ArrowRight size={16} />
                  </IconButton>
                </div>
              </figcaption>
            </figure>
          ) : (
            <div className={`project-details ${compact ? 'is-paged' : ''}`}>
              <div className="project-detail-page" ref={detailPage}>
                {(!compact || detailIndex === 0) && (
                  <div className="project-detail-intro">
                    {compact && <p>{project.description}</p>}
                    <div className="tags">
                      {project.technologies.map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                    </div>
                  </div>
                )}
                {project.features.map(
                  (feature, i) =>
                    (!compact || detailIndex === i + 1) && (
                      <div className="feature" key={feature.title}>
                        <span className="eyebrow">0{i + 1}</span>
                        <div>
                          <h2>{feature.title}</h2>
                          <p>{feature.text}</p>
                        </div>
                      </div>
                    ),
                )}
              </div>
              {compact && (
                <Stepper
                  index={detailIndex}
                  count={project.features.length + 1}
                  onChange={(next, direction) => {
                    detailDirection.current = direction
                    setDetailIndex(next)
                  }}
                  label={copy.projects.detailsPagination}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
