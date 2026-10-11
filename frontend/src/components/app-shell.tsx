import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { Joyride } from 'react-joyride'
import { LogOut, ChevronsLeft, ChevronsRight, ChevronDown, Menu, UserRound, HelpCircle } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { NAV_GROUPS, type NavGroup } from '@/lib/nav-items'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getRoleAvatarSrc } from '@/lib/role-avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationsPanel } from '@/components/notifications-panel'
import { GlobalSearch } from '@/components/global-search'
import { useOnboardingTour } from '@/features/onboarding/use-onboarding-tour'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABEL } from '@/types/roles'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BrandLockup, UctShield } from '@/components/brand-mark'
import { BrandFooter } from '@/components/brand-footer'


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
                aria-label={collapsed ? label : undefined}
                onClick={onNavigate}
                data-tour={`nav-${to === '/' ? 'dashboard' : to.slice(1)}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
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
  const tour = useOnboardingTour()

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
  })).filter((group) => group.items.length > 0)

  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-tour="profile-menu"
        aria-label={collapsed ? `Account menu for ${user?.email ?? 'you'}` : undefined}
        className={`flex w-full items-center gap-2.5 p-3 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={getRoleAvatarSrc(user?.role ?? null, false)} alt="" />
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
        <DropdownMenuItem asChild>
          <Link to="/account">
            <UserRound className="size-4" aria-hidden="true" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={tour.restart}>
          <HelpCircle className="size-4" aria-hidden="true" />
          Restart tutorial
        </DropdownMenuItem>
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
      <Joyride
        steps={tour.steps}
        run={tour.run}
        onEvent={tour.handleEvent}
        continuous
        options={{
          showProgress: true,
          skipBeacon: true,
          buttons: ['back', 'skip', 'primary'],
          primaryColor: 'var(--primary)',
          backgroundColor: 'var(--popover)',
          textColor: 'var(--popover-foreground)',
          arrowColor: 'var(--popover)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      <aside
        className={`hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-sidebar-border ${collapsed ? 'flex-col justify-center gap-1 px-2' : 'justify-between gap-2 pr-3 pl-4'}`}>
          {collapsed ? <UctShield className="h-7" /> : <BrandLockup />}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
          <SheetHeader className="border-b border-sidebar-border">
            <SheetTitle className="sr-only">LabTracker navigation</SheetTitle>
            <BrandLockup />
          </SheetHeader>
          <NavList groups={visibleGroups} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          <div className="shrink-0 border-t border-sidebar-border">{profileMenu}</div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 lg:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              data-tour="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Link to="/" aria-label="LabTracker home" className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
              <UctShield className="h-7 min-[420px]:hidden" />
              <BrandLockup compact className="hidden min-[420px]:flex sm:hidden" />
              <BrandLockup className="hidden sm:flex" />
            </Link>
            <GlobalSearch />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationsPanel />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto px-4 pt-6 pb-4 sm:px-6 sm:pt-8">
          <div className="flex-1">
            <Outlet />
          </div>
          <BrandFooter className="-mx-4 -mb-4 sm:-mx-6 sm:px-6" />
        </main>
      </div>
    </div>
  )
}
