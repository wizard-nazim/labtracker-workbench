import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Step } from 'react-joyride'
import { useMe } from '@/features/account/use-me'
import { useTour } from './use-tour'

const HUB = '/admin'
const EXAMPLE_PAGE = '/admin/equipment'

// Resolves once the step's target has rendered after a route change (or
// after 3 seconds, when Joyride skips a step whose target is missing).
function waitForTarget(selector: string) {
  return new Promise<void>((resolve) => {
    const started = performance.now()
    function check() {
      if (document.querySelector(selector) || performance.now() - started > 3000) resolve()
      else requestAnimationFrame(check)
    }
    check()
  })
}

// Three steps that teach the whole of Admin: pick an area, add with the one
// Add button, change things from a row's ⋯ menu. Runs from the admin layout,
// so it can move from the hub to the Equipment page and back.
export function useAdminTour() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const location = useLocation()
  // Only start on its own when someone first lands on the hub, never by
  // pulling them off a page they opened directly.
  const [startedOnHub] = useState(location.pathname === HUB)
  const [manual, setManual] = useState(false)

  const steps = useMemo<Step[]>(
    () => [
      {
        target: '[data-tour="admin-tiles"]',
        content: 'Everything you manage is grouped into these four areas. Choose one to see its list.',
        before: async () => {
          if (window.location.pathname !== HUB) navigate(HUB)
          await waitForTarget('[data-tour="admin-tiles"]')
        },
      },
      {
        target: '[data-tour="admin-add"]',
        content: 'Each list has one Add button. Use it to create something new.',
        before: async () => {
          if (window.location.pathname !== EXAMPLE_PAGE) navigate(EXAMPLE_PAGE)
          await waitForTarget('[data-tour="admin-add"]')
        },
      },
      {
        target: '[data-tour="row-menu"]',
        content: 'To change something that already exists, open the ⋯ menu on its row: edit, archive or delete it there.',
      },
    ],
    [navigate],
  )

  const tour = useTour(steps, me?.hasCompletedAdminTour, '/auth/admin-tour/complete')
  return {
    ...tour,
    run: tour.run && (startedOnHub || manual),
    restart: () => {
      setManual(true)
      tour.restart()
    },
  }
}
