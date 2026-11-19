import { asset } from '../data/portfolio'
import { copy } from '../data/copy'
import '../styles/tajamar.css'

export function TajamarLogo({ full = false }: { full?: boolean }) {
  return (
    <img
      className={`tajamar-logo${full ? ' tajamar-wordmark' : ''}`}
      src={asset(full ? 'images/tajamar-logo.svg' : 'images/tajamar-mark.svg')}
      alt={copy.brands.tajamarLogo}
      width={full ? 360 : 75}
      height="128"
      decoding="async"
    />
  )
}
