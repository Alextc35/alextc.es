import { copy } from '../data/copy'

export function DeveloperLabel() {
  return (
    <p className="eyebrow hero-kicker">
      <svg
        className="small-cross"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07 19.07 4.93" />
      </svg>
      <span className="hero-kicker-label">{copy.home.eyebrow}</span>
    </p>
  )
}
