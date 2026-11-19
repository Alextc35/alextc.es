import { useEffect } from 'react'
import type { RefObject } from 'react'

const interactive =
  'a,button,input,textarea,select,[role="button"],[role="tab"],[role="slider"],[contenteditable]:not([contenteditable="false"]),[data-swipe-ignore]'
const holdLimit = 320
type Gesture = {
  touch: number
  x: number
  y: number
  started: number
  movedAt: number
  horizontal: boolean
}

export function useSwipeNavigation(
  target: RefObject<HTMLElement | null>,
  navigate: (direction: number) => void,
) {
  useEffect(() => {
    const surface = target.current
    if (!surface) return

    let gesture: Gesture | null = null
    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01
    const hasSelection = () => !!window.getSelection()?.toString().trim()
    const clear = () => {
      gesture = null
    }

    const down = (event: TouchEvent) => {
      clear()
      if (event.touches.length !== 1) return
      if (!(event.target instanceof Element) || !surface.contains(event.target)) return
      if (event.target.closest(interactive) || hasSelection() || zoomed()) return
      const touch = event.touches[0]
      // Leave the screen edges to the browser's back/forward gestures.
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return
      gesture = {
        touch: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        started: event.timeStamp,
        movedAt: event.timeStamp,
        horizontal: false,
      }
    }
    const move = (event: TouchEvent) => {
      if (!gesture) return
      if (
        event.touches.length !== 1 ||
        zoomed() ||
        hasSelection() ||
        event.timeStamp - gesture.movedAt > holdLimit
      ) {
        clear()
        return
      }
      const touch = event.touches[0]
      if (touch.identifier !== gesture.touch) return
      gesture.movedAt = event.timeStamp
      const dx = Math.abs(touch.clientX - gesture.x)
      const dy = Math.abs(touch.clientY - gesture.y)
      // Once the visitor starts moving vertically, don't turn it into navigation.
      if (dy > 12 && dy > dx * 1.2) {
        clear()
        return
      }
      if (dx > 8 && dx > dy * 1.5) gesture.horizontal = true
      // Claim only an intentional horizontal gesture outside controls. Leaving
      // touch-action native prevents a drag on a button from swallowing its next tap.
      if (gesture.horizontal) {
        if (event.cancelable) event.preventDefault()
        else clear()
      }
    }
    const up = (event: TouchEvent) => {
      if (!gesture) return
      const start = gesture
      clear()
      if (
        !start.horizontal ||
        event.touches.length ||
        zoomed() ||
        hasSelection() ||
        event.timeStamp - start.movedAt > holdLimit ||
        event.timeStamp - start.started > 800
      )
        return
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.touch)
      if (!touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const threshold = Math.max(48, Math.min(80, surface.clientWidth * 0.15))
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return
      // Swipe left to advance and right to go back. One change on release.
      navigate(dx < 0 ? 1 : -1)
    }
    window.addEventListener('touchstart', down, { passive: true })
    surface.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', clear, { passive: true })
    window.addEventListener('blur', clear)
    window.addEventListener('hashchange', clear)
    window.addEventListener('contextmenu', clear)
    document.addEventListener('selectstart', clear)
    const selectionChanged = () => {
      if (hasSelection()) clear()
    }
    document.addEventListener('selectionchange', selectionChanged)
    document.addEventListener('visibilitychange', clear)
    return () => {
      window.removeEventListener('touchstart', down)
      surface.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', clear)
      window.removeEventListener('blur', clear)
      window.removeEventListener('hashchange', clear)
      window.removeEventListener('contextmenu', clear)
      document.removeEventListener('selectstart', clear)
      document.removeEventListener('selectionchange', selectionChanged)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [target, navigate])
}
