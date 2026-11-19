import { useEffect, useState } from 'react'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function useMobileNavigation() {
  return useMediaQuery('(max-width: 800px), (pointer: coarse)')
}

export function useCompact() {
  return useMediaQuery('(max-width: 800px), (max-height: 620px)')
}

export function useShortViewport() {
  return useMediaQuery('(max-height: 359px), (max-width: 600px) and (max-height: 520px)')
}

export function usePhoneLayout() {
  return useMediaQuery('(max-width: 600px)')
}
