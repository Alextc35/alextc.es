import { LockKeyhole } from 'lucide-react'
import { copy } from '../data/copy'
import { ExternalLink } from './Shared'
import { useMobileNavigation } from './useCompact'

export function ExtensionInstall({ href }: { href: string | null }) {
  const mobile = useMobileNavigation()
  if (mobile) return null
  return href ? (
    <ExternalLink href={href} className="text-link project-install">
      {copy.projects.install}
    </ExternalLink>
  ) : (
    <button
      type="button"
      className="text-link project-install"
      disabled
      title={copy.projects.installLocked}
    >
      <LockKeyhole size={16} aria-hidden="true" />
      {copy.projects.install}
    </button>
  )
}
