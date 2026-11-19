import { copy } from '../data/copy'
import { currentEducation } from '../data/portfolio'

export function CurrentEducationText() {
  return (
    <>
      {copy.about.extra.before}
      <a
        className="study-link"
        href={currentEducation.website}
        target="_blank"
        rel="noopener noreferrer"
      >
        {copy.about.extra.school}
        <span className="sr-only">{copy.all.newTab}</span>
      </a>
      {copy.about.extra.after}
    </>
  )
}
