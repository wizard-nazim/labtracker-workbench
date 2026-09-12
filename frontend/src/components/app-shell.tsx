import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  Gauge,
  FlaskConical,
  CalendarClock,
  ClipboardList,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import type { UserRole } from '@/types/roles'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationsPanel } from '@/components/notifications-panel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  to: string
  label: string
  icon: typeof Gauge
  end: boolean
  roles?: UserRole[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
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
    items: [{ to: '/admin', label: 'Admin', icon: Settings, end: false, roles: ['SuperAdmin'] }],
  },
]

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  ScienceOfficer: 'Science Officer',
  Researcher: 'Researcher',
}

function LabTrackerMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M9 3v6.5L4.5 17a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L15 9.5V3M9 3h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex min-h-svh bg-background">
      <aside
        className={`flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`flex h-14 shrink-0 items-center border-b border-sidebar-border ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 text-sidebar-primary">
              <LabTrackerMark />
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">LabTracker</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="size-4" aria-hidden="true" /> : <ChevronsLeft className="size-4" aria-hidden="true" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Main navigation">
          {visibleGroups.map((group) => (
            <div key={group.label} className={collapsed ? 'px-2 pb-3' : 'px-3 pb-3'}>
              {!collapsed && (
                <p className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground">{group.label}</p>
              )}
              {collapsed && <div className="mx-1 my-1 h-px bg-sidebar-border" aria-hidden="true" />}
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                        collapsed ? 'justify-center px-0' : ''
                      } ${
                        isActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                      }`
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex w-full items-center gap-2.5 p-3 text-left outline-none transition-colors hover:bg-sidebar-accent/60 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-xs">{user?.email.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user?.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user ? ROLE_LABEL[user.role] : ''}</p>
                  </div>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="font-normal text-foreground">{user?.email}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user ? ROLE_LABEL[user.role] : ''}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-1 border-b border-border px-6">
          <NotificationsPanel />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
