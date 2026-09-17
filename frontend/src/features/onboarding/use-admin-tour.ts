import type { Step } from 'react-joyride'
import { useMe } from '@/features/account/use-me'
import { useTour } from './use-tour'

const STEPS: Step[] = [
  {
    target: '[data-tour="admin-tabs"]',
    content: 'These tabs hold all the master data your equipment and bookings depend on.',
  },
  {
    target: '[data-tour="admin-tab-departments"]',
    content: 'Start here — departments own equipment and organize research groups.',
  },
  {
    target: '[data-tour="admin-tab-equipment-types"]',
    content: 'Add an equipment type here, then click it to manage its actual units — add machines, upload photos, change status, and assign Science Officers, all in one place.',
  },
  {
    target: '[data-tour="admin-tab-facilities"]',
    content: 'Facilities like BSL2 labs can have Science Officers assigned to oversee them.',
  },
  {
    target: '[data-tour="admin-tab-users"]',
    content: 'Create login accounts here, then link them to a Researcher or PI profile so they can book equipment.',
  },
  {
    target: '[data-tour="danger-zone"]',
    content: "Use this to wipe demo data before entering a real client's data. This can't be undone.",
  },
]

export function useAdminTour() {
  const { data: me } = useMe()
  return useTour(STEPS, me?.hasCompletedAdminTour, '/auth/admin-tour/complete')
}
