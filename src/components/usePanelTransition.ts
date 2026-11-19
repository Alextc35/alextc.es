import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

type PanelKey = string | number
type PanelTransitionOptions = { direction?: number; distance?: number }

export function usePanelTransition<T extends HTMLElement>(
  ref: RefObject<T | null>,
  key: PanelKey,
  { direction, distance = 8 }: PanelTransitionOptions = {},
) {
  const previous = useRef(key)

  useLayoutEffect(() => {
    const last = previous.current
    previous.current = key
    if (last === key) return
    const panel = ref.current
    if (
      !panel ||
      typeof panel.animate !== 'function' ||
      !window.matchMedia('(max-width: 800px), (pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return

    const travel = Math.sign(
      direction || (typeof key === 'number' && typeof last === 'number' ? key - last : 1),
    )
    // Replace the content immediately, then settle it into place. Opacity stays
    // at one throughout, so navigation never reveals an empty loading frame.
    const animation = panel.animate(
      [
        { transform: `translate3d(${travel * distance}px,0,0)` },
        { transform: 'translate3d(0,0,0)' },
      ],
      { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' },
    )
    animation.id = 'panel-transition'
    return () => animation.cancel()
  }, [ref, key, direction, distance])
}
