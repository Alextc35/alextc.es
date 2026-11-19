import { motion, useIsPresent, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { asset, profile } from '../data/portfolio'
import { copy } from '../data/copy'

export function IntroScreen({ onSkip, firstVisit }: { onSkip: () => void; firstVisit: boolean }) {
  const present = useIsPresent()
  const reducedMotion = useReducedMotion()
  const animated = firstVisit && !reducedMotion
  return (
    <motion.div
      className={`intro-screen${animated ? '' : ' is-quiet'}`}
      data-intro-screen=""
      data-intro-animated={animated}
      inert={!present}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : animated ? 0.38 : 0.16, ease: [0.4, 0, 0.2, 1] }}
      style={{ pointerEvents: present ? 'auto' : 'none' }}
    >
      <motion.svg
        className="intro-orbit"
        viewBox="0 0 500 500"
        fill="none"
        aria-hidden="true"
        initial={animated ? { opacity: 0, rotate: -12, scale: 0.96 } : false}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: animated ? 0.8 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <ellipse cx="250" cy="250" rx="217" ry="155" transform="rotate(-28 250 250)" />
        <ellipse cx="250" cy="250" rx="217" ry="155" transform="rotate(28 250 250)" />
        <circle cx="250" cy="250" r="190" />
        <path d="M250 26v12M250 462v12M26 250h12M462 250h12" />
        <circle cx="432" cy="197" r="3" className="intro-orbit-point" />
      </motion.svg>
      <div className="intro-content">
        <div className="intro-monogram" aria-hidden="true">
          <motion.img
            className="intro-brand-logo"
            src={asset('favicon-avatar-180.png')}
            width="180"
            height="180"
            alt=""
            initial={animated ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: animated ? 0.5 : 0, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <motion.p
          className="intro-name"
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: animated ? 0.4 : 0, delay: animated ? 0.12 : 0 }}
        >
          {profile.name}
        </motion.p>
        <motion.p
          className="intro-tagline"
          initial={animated ? { opacity: 0, y: 7 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animated ? 0.4 : 0, delay: animated ? 0.18 : 0 }}
        >
          {copy.home.note}
        </motion.p>
        <div className="intro-track" aria-hidden="true">
          <motion.span
            initial={animated ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{ duration: animated ? 1.1 : 0, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="intro-status" role="status" aria-live="polite">
          {copy.intro.loading}
        </p>
      </div>
      <button className="intro-skip" onClick={onSkip} tabIndex={present ? 0 : -1}>
        {copy.intro.skip}
        <ArrowUpRight size={14} aria-hidden="true" />
      </button>
    </motion.div>
  )
}
