import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Background } from './components/Background'
import { useMobileNavigation, useShortViewport } from './components/useCompact'
import { usePanelTransition } from './components/usePanelTransition'
import { useSwipeNavigation } from './components/useSwipeNavigation'
import { IntroScreen } from './components/IntroScreen'
import { useFirstVisitIntro } from './components/useFirstVisitIntro'
import { CompactView } from './views/CompactView'
import { Home } from './views/Home'
import { About } from './views/About'
import { Journey } from './views/Journey'
import { Projects } from './views/Projects'
import { Contact } from './views/Contact'
import { copy, views } from './data/copy'
import type { ViewId } from './data/copy'
import { asset, profile } from './data/portfolio'

const screens = { home: Home, about: About, projects: Projects, journey: Journey, contact: Contact }
const getView = (): ViewId => {
  const hash = window.location.hash.slice(1)
  return views.includes(hash as ViewId) ? (hash as ViewId) : 'home'
}
const viewMotion: Variants = {
  enter: { opacity: 0, y: 12, filter: 'blur(3px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(2px)' },
}

export default function App() {
  const [view, setView] = useState<ViewId>(getView)
  const [transitionDirection, setTransitionDirection] = useState(0)
  const shortViewport = useShortViewport()
  const mobileNavigation = useMobileNavigation()
  const reduceMotion = useReducedMotion()
  const { showIntro, firstVisit, dismissIntro } = useFirstVisitIntro()
  const main = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const previousView = useRef(view)
  const hasNavigated = useRef(false)
  const introWasVisible = useRef(showIntro)
  const navigationIntent = useRef(0)
  const activeIndex = views.indexOf(view)
  const View = screens[view]
  const readingMode = shortViewport && view !== 'journey'
  const navigate = useCallback((direction: number) => {
    navigationIntent.current = direction
    const index = views.indexOf(getView())
    window.location.hash = views[(index + direction + views.length) % views.length]
  }, [])
  useSwipeNavigation(main, navigate)
  usePanelTransition(stage, view, { direction: transitionDirection, distance: 14 })
  useEffect(() => {
    const update = () => {
      const nextView = getView()
      hasNavigated.current = true
      setTransitionDirection(
        navigationIntent.current ||
          Math.sign(views.indexOf(nextView) - views.indexOf(previousView.current)),
      )
      navigationIntent.current = 0
      previousView.current = nextView
      setView(nextView)
    }
    const keyboard = (event: KeyboardEvent) => {
      if (showIntro || document.querySelector('dialog[open]')) return
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !['ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        return
      event.preventDefault()
      navigate(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('hashchange', update)
    window.addEventListener('keydown', keyboard)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener('keydown', keyboard)
    }
  }, [navigate, showIntro])
  useEffect(() => {
    if (introWasVisible.current && !showIntro)
      main.current?.querySelector<HTMLElement>('.view-title')?.focus({ preventScroll: true })
    introWasVisible.current = showIntro
  }, [showIntro])
  useEffect(() => {
    document.title = copy.app.title(
      view === 'home' ? copy.app.homeTitle : copy.nav[view],
      profile.name,
    )
  }, [view])
  const focusHeading = useCallback((node: HTMLDivElement | null) => {
    stage.current = node
    if (node && hasNavigated.current)
      node.querySelector<HTMLElement>('.view-title')?.focus({ preventScroll: true })
  }, [])
  return (
    <MotionConfig reducedMotion="user">
      <div className="portfolio-shell" inert={showIntro} aria-hidden={showIntro || undefined}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(event) => {
            event.preventDefault()
            main.current?.focus()
          }}
        >
          {copy.footer.skip}
        </a>
        <Background paused={!!reduceMotion} section={activeIndex} />
        <header className="site-header">
          <div className="header-brand">
            <a
              className="wordmark brand-logo-link"
              href="#home"
              aria-label={copy.app.homeLink(profile.name)}
            >
              <img
                className="brand-avatar"
                src={asset('favicon-avatar-180.png')}
                alt=""
                width="42"
                height="42"
                decoding="async"
              />
            </a>
            <span className="header-location eyebrow">{copy.app.portfolio}</span>
          </div>
          <nav className="main-nav" aria-label={copy.app.navigation}>
            {views.map((id, i) => (
              <a key={id} href={`#${id}`} aria-current={view === id ? 'page' : undefined}>
                <span className="nav-number" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="nav-label">
                  {copy.nav[id]}
                  {view === id && (
                    <motion.span
                      className="nav-active"
                      layoutId="active-nav"
                      transition={{ duration: reduceMotion ? 0 : 0.24 }}
                    />
                  )}
                </span>
              </a>
            ))}
          </nav>
        </header>
        <main id="main-content" ref={main} tabIndex={-1}>
          {/* Mobile views settle into place without fading through an empty stage. */}
          {mobileNavigation ? (
            <div ref={focusHeading} className="view-stage" key={view}>
              {readingMode ? <CompactView view={view} /> : <View />}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                ref={focusHeading}
                className="view-stage"
                key={view}
                variants={viewMotion}
                initial={reduceMotion ? false : 'enter'}
                animate="visible"
                exit={reduceMotion ? { opacity: 0 } : 'exit'}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {readingMode ? <CompactView view={view} /> : <View />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        <footer className="site-footer">
          <span className="footer-signature">
            {copy.all.copyright} {profile.copyrightYear} - {profile.handle}
          </span>
          <span className="keyboard-hint">
            {copy.footer.keyboard}
            <kbd>{copy.footer.altKey}</kbd>
            <ArrowLeft size={11} />
            <ArrowRight size={11} />
          </span>
        </footer>
      </div>
      <AnimatePresence>
        {showIntro && (
          <IntroScreen key="first-visit-intro" onSkip={dismissIntro} firstVisit={firstVisit} />
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
