import { Gauge, FlaskConical, CalendarClock, ClipboardList, Settings, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/types/roles'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  roles?: UserRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Shared by the app shell's sidebar/mobile nav and global search, so both
// always agree on the app's page list without duplicating it.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: Gauge, end: true }],
  },
  {
    label: 'Lab',
    items: [
      { to: '/equipment', label: 'Equipment', icon: FlaskConical, end: false },
      { to: '/bookings', label: 'Bookings', icon: CalendarClock, end: false },
      { to: '/usage', label: 'Usage', icon: ClipboardList, end: false },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, end: false, roles: ['SuperAdmin'] },
      { to: '/admin', label: 'Admin', icon: Settings, end: false, roles: ['SuperAdmin'] },
    ],
  },
]
