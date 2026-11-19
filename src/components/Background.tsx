import { useEffect, useRef } from 'react'

export function Background({ paused, section }: { paused: boolean; section: number }) {
  const field = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (paused) return
    let frame = 0
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || document.hidden) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        field.current?.style.setProperty('--px', `${(event.clientX / innerWidth - 0.5) * 18}px`)
        field.current?.style.setProperty('--py', `${(event.clientY / innerHeight - 0.5) * 12}px`)
      })
    }
    const visibility = () => field.current?.classList.toggle('is-hidden', document.hidden)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [paused])
  return (
    <div
      ref={field}
      className={`ambient-field ${paused ? 'is-paused' : ''}`}
      aria-hidden="true"
      data-section={section}
    >
      <div className="ambient-halo" />
      <svg className="orbital-field" viewBox="0 0 1000 1000" fill="none">
        <g className="orbital-lines">
          {Array.from({ length: 17 }, (_, i) => (
            <ellipse
              key={i}
              cx="500"
              cy="500"
              rx={120 + i * 19}
              ry={280 + i * 7}
              transform={`rotate(${i * 8 - 64} 500 500)`}
            />
          ))}
        </g>
        <circle className="orbit-dot" cx="500" cy="96" r="4" />
      </svg>
      <div className="grain" />
    </div>
  )
}
