import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LogOut, ChevronsLeft, ChevronsRight, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { NAV_GROUPS, type NavGroup } from '@/lib/nav-items'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationsPanel } from '@/components/notifications-panel'
import { GlobalSearch } from '@/components/global-search'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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

// Shared between the desktop <aside> and the mobile Sheet so both stay in sync.
function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3" aria-label="Main navigation">
      {groups.map((group) => (
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
                onClick={onNavigate}
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
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
  })).filter((group) => group.items.length > 0)

  const profileMenu = (
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
          <span className="text-xs font-normal text-muted-foreground">{user ? ROLE_LABEL[user.role] : ''}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex min-h-svh bg-background">
      <aside
        className={`hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex ${
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

        <NavList groups={visibleGroups} collapsed={collapsed} />

        <div className="shrink-0 border-t border-sidebar-border">{profileMenu}</div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 text-sidebar-foreground [&]:bg-sidebar">
          <SheetHeader className="flex-row items-center gap-2 border-b border-sidebar-border text-sidebar-primary">
            <LabTrackerMark />
            <SheetTitle className="text-sidebar-foreground">LabTracker</SheetTitle>
          </SheetHeader>
          <NavList groups={visibleGroups} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          <div className="shrink-0 border-t border-sidebar-border">{profileMenu}</div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-primary lg:hidden">
              <LabTrackerMark />
              <span className="hidden text-sm font-semibold tracking-tight text-foreground min-[420px]:inline">
                LabTracker
              </span>
            </div>
            <GlobalSearch />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationsPanel />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
