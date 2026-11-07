import type { Step } from 'react-joyride'
import { NAV_GROUPS } from '@/lib/nav-items'
import type { UserRole } from '@/types/roles'
import { useMe } from '@/features/account/use-me'
import { useTour } from './use-tour'

const NAV_STEP_CONTENT: Record<string, string> = {
  '/': 'Your Dashboard — a quick overview of equipment status and active bookings.',
  '/equipment': 'Browse all lab equipment here, check availability, and request a booking.',
  '/bookings': 'See bookings and their status here.',
  '/usage': "Log actual usage sessions for equipment you've used.",
  '/reports': 'Usage analytics across the department.',
  '/admin': 'Manage departments, equipment, research groups, facilities, and users here.',
}

const SEARCH_STEP: Step = {
  target: '[data-tour="global-search"]',
  content: 'Press ⌘K (or Ctrl+K) anytime to jump straight to any equipment item or page.',
}

const PAGE_TOUR_STEP: Step = {
  target: '[data-tour="page-tour"]',
  content: 'Not sure what something on a page does? This button walks you through the page you are on.',
}

const NOTIFICATIONS_STEP: Step = {
  target: '[data-tour="notifications"]',
  content: 'Keep an eye on this bell for equipment and booking updates.',
}

// On narrow viewports, the sidebar nav and profile menu live inside the
// collapsible mobile drawer — they're display:none until it's opened, so
// Joyride can't target them directly. Point at the menu toggle instead.
function buildMobileSteps(): Step[] {
  return [
    {
      target: '[data-tour="mobile-nav-toggle"]',
      content: 'Tap here to see navigation between pages, and your account menu.',
    },
    SEARCH_STEP,
    PAGE_TOUR_STEP,
    NOTIFICATIONS_STEP,
  ]
}

function buildDesktopSteps(role: UserRole | undefined): Step[] {
  const navSteps: Step[] = NAV_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => !item.roles || (role && item.roles.includes(role)))
      .map((item) => ({
        target: `[data-tour="nav-${item.to === '/' ? 'dashboard' : item.to.slice(1)}"]`,
        content: NAV_STEP_CONTENT[item.to] ?? `Go to ${item.label}.`,
      })),
  )

  return [
    ...navSteps,
    SEARCH_STEP,
    PAGE_TOUR_STEP,
    NOTIFICATIONS_STEP,
    {
      target: '[data-tour="profile-menu"]',
      content: 'Your account is here, and so is Replay all tutorials if you want to see these tours again.',
    },
  ]
}

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
}

function buildSteps(role: UserRole | undefined): Step[] {
  return isDesktopViewport() ? buildDesktopSteps(role) : buildMobileSteps()
}

export function useOnboardingTour() {
  const { data: me } = useMe()
  const steps = buildSteps(me?.role)
  return useTour(steps, me?.hasCompletedOnboarding, '/auth/onboarding/complete')
}
