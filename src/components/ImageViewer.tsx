import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { copy } from '../data/copy'
import '../styles/image-viewer.css'

type ViewerImage = { src: string; alt: string }
type ImageViewerContextValue = {
  openImage: (image: ViewerImage, opener: HTMLButtonElement) => void
}
const ImageViewerContext = createContext<ImageViewerContextValue | null>(null)

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<ViewerImage | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const dismissedOpener = useRef<HTMLButtonElement | null>(null)
  const focusFrame = useRef<number | null>(null)
  const backdropPointerDown = useRef(false)
  const titleId = useId()
  const hintId = useId()
  const openImage = useCallback((nextImage: ViewerImage, trigger: HTMLButtonElement) => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    dismissedOpener.current = null
    opener.current = trigger
    setImage(nextImage)
  }, [])
  const clearViewerFocus = useCallback(() => {
    const trigger = dismissedOpener.current
    if (!trigger) return
    trigger.blur()
    const active = document.activeElement
    // Safari can restore focus to the surrounding tab panel instead of the
    // tapped button. Clear that native restoration without changing keyboard styles.
    if (
      active instanceof HTMLElement &&
      (active.contains(trigger) || dialog.current?.contains(active))
    )
      active.blur()
  }, [])
  const closeImage = useCallback(() => {
    dismissedOpener.current = opener.current
    dialog.current?.close()
    setImage(null)
    clearViewerFocus()
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    focusFrame.current = requestAnimationFrame(() => {
      clearViewerFocus()
      focusFrame.current = null
    })
    opener.current = null
    backdropPointerDown.current = false
  }, [clearViewerFocus])
  const context = useMemo(() => ({ openImage }), [openImage])

  useLayoutEffect(() => {
    if (image && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [image])

  useEffect(() => {
    window.addEventListener('hashchange', closeImage)
    return () => {
      window.removeEventListener('hashchange', closeImage)
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    }
  }, [closeImage])

  return (
    <ImageViewerContext.Provider value={context}>
      {children}
      {createPortal(
        <dialog
          ref={dialog}
          className="image-viewer"
          data-image-viewer
          aria-labelledby={titleId}
          aria-describedby={hintId}
          onCancel={(event) => {
            event.preventDefault()
            closeImage()
          }}
          onClose={clearViewerFocus}
          onPointerDown={(event) => {
            backdropPointerDown.current = event.target === event.currentTarget
          }}
          onPointerCancel={() => {
            backdropPointerDown.current = false
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && backdropPointerDown.current) closeImage()
            backdropPointerDown.current = false
          }}
        >
          <h2 id={titleId} className="sr-only">
            {copy.viewer.title}
          </h2>
          <button
            type="button"
            className="image-viewer-close"
            aria-label={copy.viewer.close}
            onClick={closeImage}
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
          {image && (
            <img className="image-viewer-image" src={image.src} alt={image.alt} decoding="async" />
          )}
          <p id={hintId} className="image-viewer-hint">
            {copy.viewer.hint}
          </p>
        </dialog>,
        document.body,
      )}
    </ImageViewerContext.Provider>
  )
}

export function ZoomableImage({
  src,
  alt,
  ...imageProps
}: ComponentPropsWithoutRef<'img'> & { src: string; alt: string }) {
  const viewer = useContext(ImageViewerContext)
  if (!viewer) throw new Error('ZoomableImage requires ImageViewerProvider')
  return (
    <button
      type="button"
      className="image-viewer-trigger"
      aria-label={copy.viewer.open(alt)}
      aria-haspopup="dialog"
      onClick={(event) =>
        viewer.openImage(
          { src: event.currentTarget.querySelector('img')?.currentSrc || src, alt },
          event.currentTarget,
        )
      }
    >
      <img {...imageProps} src={src} alt={alt} />
    </button>
  )
}
