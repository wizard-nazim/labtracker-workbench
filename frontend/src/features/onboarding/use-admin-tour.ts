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

export const REPLAY_ADMIN_TOUR_STATE = { replayAdminTour: true }

function isReplayRequest(state: unknown) {
  return typeof state === 'object' && state !== null && 'replayAdminTour' in state
}

// Teaches the whole of Admin: where requests land, the order things are set
// up in, then pick an area, add with the one Add button, and change things
// from a row's ⋯ menu. Runs from the admin layout, so it can move from the
// hub to the Equipment page and back.
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
        target: '[data-tour="admin-requests"]',
        content:
          'Requests is where people ask you for something, such as a new password when they forget theirs. It stands out when something is waiting, and the bell tells you too.',
        before: async () => {
          if (window.location.pathname !== HUB) navigate(HUB)
          await waitForTarget('[data-tour="admin-requests"]')
        },
      },
      {
        // The checklist only shows until setup is done, so fall back to the
        // tiles; the text reads right on either.
        target: '[data-tour="admin-setup"], [data-tour="admin-tiles"]',
        content:
          'Set things up in this order, because each needs the ones before it: departments, rooms, equipment types, equipment, principal investigators, labs, and then accounts. For example, a student account needs a lab, and a lab needs a PI. The Getting started checklist ticks these off as you go.',
      },
      {
        target: '[data-tour="admin-tiles"]',
        content: 'Everything you manage is grouped into these four areas. Choose one to see its list.',
      },
      {
        target: '[data-tour="admin-add"]',
        content: "Each list has one Add button. If something it needs doesn't exist yet, the form tells you what to add first.",
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

  // "Replay all tutorials" sends the admin here with this state once the app
  // tour ends. Picked up during render (keyed on the navigation) rather than
  // in an effect, and turned into a manual run so the tour's own navigation,
  // which drops the state, doesn't stop it.
  const [replayKey, setReplayKey] = useState<string | null>(null)
  if (isReplayRequest(location.state) && replayKey !== location.key) {
    setReplayKey(location.key)
    setManual(true)
    tour.restart()
  }

  return {
    ...tour,
    // Waits for the general app tour to finish first, so two tours never
    // overlap on someone's first visit.
    run: tour.run && (manual || (startedOnHub && me?.hasCompletedOnboarding === true)),
    restart: () => {
      setManual(true)
      tour.restart()
    },
  }
}
