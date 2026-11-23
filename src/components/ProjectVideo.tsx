import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'
import { asset, portraitPromoMedia } from '../data/portfolio'
import type { ProjectPromo } from '../data/portfolio'
import { copy } from '../data/copy'
import '../styles/project-video.css'

export function ProjectVideo({ promo, name }: { promo: ProjectPromo; name: string }) {
  const [activeVideo, setActiveVideo] = useState<ProjectPromo['landscape'] | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const keyboardOpened = useRef(false)
  const focusFrame = useRef<number | null>(null)
  const backdropPointerDown = useRef(false)
  const titleId = useId()
  const clearPointerFocus = useCallback(() => {
    const button = trigger.current
    if (!button) return
    button.blur()
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      (active.contains(button) || dialog.current?.contains(active))
    )
      active.blur()
  }, [])
  const closeVideo = useCallback(() => {
    if (!dialog.current?.open) return
    player.current?.pause()
    dialog.current.close()
    setActiveVideo(null)
    backdropPointerDown.current = false
    if (keyboardOpened.current) trigger.current?.focus({ preventScroll: true })
    else {
      clearPointerFocus()
      focusFrame.current = requestAnimationFrame(() => {
        clearPointerFocus()
        focusFrame.current = null
      })
    }
  }, [clearPointerFocus])

  useLayoutEffect(() => {
    if (!activeVideo) return
    const video = player.current
    dialog.current?.showModal()
    void video?.play().catch(() => undefined)
    return () => {
      video?.pause()
      video?.removeAttribute('src')
      video?.load()
    }
  }, [activeVideo])

  useEffect(() => {
    window.addEventListener('hashchange', closeVideo)
    return () => {
      window.removeEventListener('hashchange', closeVideo)
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    }
  }, [closeVideo])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="project-video-trigger"
        aria-label={copy.projects.playPromo(name)}
        aria-haspopup="dialog"
        onClick={(event) => {
          if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
          keyboardOpened.current = event.detail === 0
          setActiveVideo(
            window.matchMedia(portraitPromoMedia).matches ? promo.portrait : promo.landscape,
          )
        }}
      >
        <picture>
          <source
            media={portraitPromoMedia}
            srcSet={asset(promo.portrait.poster)}
            width={promo.portrait.width}
            height={promo.portrait.height}
          />
          <img
            src={asset(promo.landscape.poster)}
            alt={promo.alt}
            width={promo.landscape.width}
            height={promo.landscape.height}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </picture>
        <span className="project-video-play" aria-hidden="true">
          <Play size={24} fill="currentColor" />
        </span>
        <span className="project-video-label" aria-hidden="true">
          {copy.projects.promo}
        </span>
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          className="image-viewer project-video-viewer"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault()
            closeVideo()
          }}
          onPointerDown={(event) => {
            backdropPointerDown.current = event.target === event.currentTarget
          }}
          onPointerCancel={() => {
            backdropPointerDown.current = false
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && backdropPointerDown.current) closeVideo()
            backdropPointerDown.current = false
          }}
        >
          <h2 id={titleId} className="sr-only">
            {copy.projects.promoTitle(name)}
          </h2>
          <button
            type="button"
            className="image-viewer-close"
            aria-label={copy.projects.closeVideo}
            onClick={closeVideo}
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
          {activeVideo && (
            <video
              ref={player}
              className="image-viewer-image project-video-player"
              src={asset(activeVideo.src)}
              poster={asset(activeVideo.poster)}
              width={activeVideo.width}
              height={activeVideo.height}
              aria-label={copy.projects.promoTitle(name)}
              controls
              autoPlay
              playsInline
              preload="none"
            >
              {copy.projects.videoUnavailable}{' '}
              <a href={asset(activeVideo.src)}>{copy.projects.downloadVideo}</a>
            </video>
          )}
          <p className="image-viewer-hint">{copy.projects.promoTitle(name)}</p>
        </dialog>,
        document.body,
      )}
    </>
  )
}
