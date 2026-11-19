import { asset, profile } from '../data/portfolio'
import { copy } from '../data/copy'

export function HeroPortrait() {
  return (
    <div className="portrait-composition">
      <div className="portrait-index" aria-hidden="true">
        {copy.home.portraitIndex}
      </div>
      <div className="portrait-frame">
        <img
          src={asset(profile.portrait)}
          alt={copy.home.portrait}
          width="1254"
          height="1254"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="portrait-caption">
        <span>{profile.name.toLocaleUpperCase(copy.locale)}</span>
        <span>{copy.home.portraitLocation}</span>
      </div>
      <span className="portrait-coordinate" aria-hidden="true">
        {copy.home.coordinates}
      </span>
      <div className="portrait-seal" aria-hidden="true">
        <span>{copy.home.sealIdeas}</span>
        <span className="seal-star">{copy.all.star}</span>
        <span>{copy.home.sealCode}</span>
      </div>
    </div>
  )
}
