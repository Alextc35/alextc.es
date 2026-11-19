import { useEffect } from 'react'
import type { RefObject } from 'react'

type Gesture = {
  touch: number
  x: number
  y: number
  started: number
  movedAt: number
  horizontal: boolean
}

export function useImageSwipe(
  target: RefObject<HTMLElement | null>,
  moveImage: (direction: number) => void,
  enabled: boolean,
) {
  useEffect(() => {
    const surface = target.current
    if (!enabled || !surface) return

    let gesture: Gesture | null = null
    let suppressClickUntil = 0
    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01
    const selected = () => !!window.getSelection()?.toString().trim()
    const clear = () => {
      gesture = null
    }
    const down = (event: TouchEvent) => {
      clear()
      suppressClickUntil = 0
      if (event.touches.length !== 1 || zoomed() || selected()) return
      if (!(event.target instanceof Element) || !surface.contains(event.target)) return
      const touch = event.touches[0]
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return
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
        selected() ||
        event.timeStamp - gesture.movedAt > 320
      ) {
        clear()
        return
      }
      const touch = event.touches[0]
      if (touch.identifier !== gesture.touch) return
      gesture.movedAt = event.timeStamp
      const dx = Math.abs(touch.clientX - gesture.x)
      const dy = Math.abs(touch.clientY - gesture.y)
      if (dy > 12 && dy > dx * 1.2) {
        clear()
        return
      }
      if (dx > 8 && dx > dy * 1.5) gesture.horizontal = true
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
        selected() ||
        event.timeStamp - start.movedAt > 320 ||
        event.timeStamp - start.started > 800
      )
        return
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.touch)
      if (!touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const threshold = Math.max(48, Math.min(80, surface.clientWidth * 0.15))
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return
      // A compatibility click following this gesture must not open the viewer.
      suppressClickUntil = Date.now() + 700
      moveImage(dx < 0 ? 1 : -1)
    }
    const click = (event: MouseEvent) => {
      if (event.detail === 0 || Date.now() > suppressClickUntil) return
      event.preventDefault()
      event.stopImmediatePropagation()
      suppressClickUntil = 0
    }
    const selectionChanged = () => {
      if (selected()) clear()
    }

    window.addEventListener('touchstart', down, { passive: true })
    surface.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', clear, { passive: true })
    surface.addEventListener('click', click, true)
    window.addEventListener('blur', clear)
    window.addEventListener('hashchange', clear)
    window.addEventListener('contextmenu', clear)
    document.addEventListener('visibilitychange', clear)
    document.addEventListener('selectionchange', selectionChanged)
    return () => {
      window.removeEventListener('touchstart', down)
      surface.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', clear)
      surface.removeEventListener('click', click, true)
      window.removeEventListener('blur', clear)
      window.removeEventListener('hashchange', clear)
      window.removeEventListener('contextmenu', clear)
      document.removeEventListener('visibilitychange', clear)
      document.removeEventListener('selectionchange', selectionChanged)
    }
  }, [target, moveImage, enabled])
}
