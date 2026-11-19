import { useRef } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { copy } from '../data/copy'

export function ExternalLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={16} aria-hidden="true" />
      <span className="sr-only">{copy.all.newTab}</span>
    </a>
  )
}

export function IconButton({
  className = '',
  onClick,
  onPointerDown,
  onKeyDown,
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  const pointer = useRef('')
  return (
    <button
      {...props}
      type="button"
      className={`icon-button ${className}`.trim()}
      onPointerDown={(event) => {
        pointer.current = event.pointerType
        onPointerDown?.(event)
      }}
      onKeyDown={(event) => {
        pointer.current = ''
        onKeyDown?.(event)
      }}
      onClick={(event) => {
        const touch = pointer.current === 'touch' || pointer.current === 'pen'
        onClick?.(event)
        if (touch) {
          const button = event.currentTarget
          button.blur()
          const active = document.activeElement
          if (active instanceof HTMLElement && active.contains(button)) active.blur()
        }
        pointer.current = ''
      }}
    />
  )
}

export function Stepper({
  index,
  count,
  onChange,
  label,
}: {
  index: number
  count: number
  onChange: (index: number, direction: number) => void
  label: string
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="step-count">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <span className="step-slash">{copy.all.separator}</span>
        {String(count).padStart(2, '0')}
      </span>
      <div className="step-line" aria-hidden="true">
        <span style={{ width: `${((index + 1) / count) * 100}%` }} />
      </div>
      <IconButton
        aria-label={copy.previous}
        onClick={() => onChange((index - 1 + count) % count, -1)}
      >
        <ArrowLeft size={17} />
      </IconButton>
      <IconButton aria-label={copy.next} onClick={() => onChange((index + 1) % count, 1)}>
        <ArrowRight size={17} />
      </IconButton>
    </div>
  )
}

export function ViewHeading({
  eyebrow,
  children,
  className = '',
}: {
  eyebrow: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`view-heading ${className}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="view-title" tabIndex={-1}>
        {children}
      </h1>
    </div>
  )
}

export function Tabs<T extends string>({
  options,
  active,
  onChange,
  label,
  idPrefix,
  panelId,
}: {
  options: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
  label: string
  idPrefix: string
  panelId: string
}) {
  return (
    <div className="segment-tabs" role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.id}
          id={`${idPrefix}-${option.id}`}
          role="tab"
          tabIndex={option.id === active ? 0 : -1}
          aria-selected={option.id === active}
          aria-controls={panelId}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return
            let next = index
            if (event.key === 'ArrowRight') next = (index + 1) % options.length
            else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = options.length - 1
            else return
            event.preventDefault()
            onChange(options[next].id)
            event.currentTarget.parentElement
              ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next]?.focus()
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
