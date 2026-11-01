import { useSyncExternalStore } from 'react'

// True while the media query matches; re-renders when it starts or stops.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// Tailwind's md breakpoint (48rem): tables from here up, cards below.
export function useIsDesktop() {
  return useMediaQuery('(min-width: 48rem)')
}
