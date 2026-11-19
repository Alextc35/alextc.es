import { useCallback, useEffect, useState } from 'react'
import { asset, journey, profile, projects } from '../data/portfolio'

const sessionKey = 'portfolio:intro-seen'
const motionPreference = '(prefers-reduced-motion: reduce)'
const imageUrls = [
  ...new Set([
    asset(profile.portrait),
    asset('favicon-avatar-180.png'),
    asset('images/tajamar-logo.svg'),
    ...Object.values(journey).flatMap((entries) =>
      entries.flatMap((entry) => (entry.logo ? [asset(entry.logo)] : [])),
    ),
    ...projects.flatMap((project) => project.images.map((image) => asset(image.src))),
  ]),
]

function needsIntro() {
  if (window.matchMedia(motionPreference).matches) return false
  try {
    return sessionStorage.getItem(sessionKey) !== '1'
  } catch {
    return true
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(sessionKey, '1')
  } catch {
    /* Storage is optional: the portfolio must remain usable without it. */
  }
}

export function useFirstVisitIntro() {
  const [firstVisit] = useState(needsIntro)
  const [showIntro, setShowIntro] = useState(
    () => document.documentElement.dataset.portfolioReady !== '1',
  )
  const dismissIntro = useCallback(() => {
    markSeen()
    document.documentElement.dataset.portfolioReady = '1'
    setShowIntro(false)
  }, [])

  useEffect(() => {
    if (!showIntro) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const frames: number[] = []
    const finish = () => {
      if (!cancelled) dismissIntro()
    }
    const minimum = firstVisit
      ? new Promise<void>((resolve) => {
          timers.push(setTimeout(resolve, 650))
        })
      : Promise.resolve()
    const preloadedImages = imageUrls.map((src) => {
      const image = new Image()
      image.loading = 'eager'
      image.decoding = 'async'
      image.src = src
      return image
    })
    const images = [
      ...document.querySelectorAll<HTMLImageElement>('#main-content img'),
      ...preloadedImages,
    ]
    const imageLoads = Promise.allSettled(
      images.map((image) => {
        image.loading = 'eager'
        return image.decode?.().catch(() => undefined) ?? Promise.resolve()
      }),
    )
    const imageDeadline = new Promise<void>((resolve) => {
      timers.push(setTimeout(resolve, 6000))
    })
    const fonts = async () => {
      if (!document.fonts) return
      const sample = 'AaÁáÉéÍíÓóÚúÑñ0123456789'
      await Promise.allSettled([
        document.fonts.load('400 16px "JetBrains Mono Variable"', sample),
        document.fonts.load('500 16px "JetBrains Mono Variable"', sample),
        document.fonts.load('400 16px "Pixelify Sans Variable"', sample),
        document.fonts.load('500 16px "Pixelify Sans Variable"', sample),
      ])
      await document.fonts.ready
    }
    const paintedFrame = () =>
      new Promise<void>((resolve) => {
        frames.push(requestAnimationFrame(() => resolve()))
      })
    // Every new document waits for fonts and the assets of all five sections.
    // A ready document can remount React without replaying the entry screen.
    // Broken images cannot hold the page forever; fonts settle before reveal.
    void Promise.all([minimum, fonts(), Promise.race([imageLoads, imageDeadline])]).then(
      async () => {
        if (cancelled) return
        await paintedFrame()
        if (cancelled) return
        await paintedFrame()
        finish()
      },
    )
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      frames.forEach(cancelAnimationFrame)
      window.removeEventListener('keydown', keyboard)
    }
  }, [showIntro, firstVisit, dismissIntro])

  return { showIntro, firstVisit, dismissIntro }
}
