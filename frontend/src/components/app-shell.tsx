import { useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Joyride, type Step } from 'react-joyride'
import { LogOut, ChevronsLeft, ChevronsRight, ChevronDown, Menu, UserRound, RotateCcw, CircleHelp, X } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { NAV_GROUPS, type NavGroup } from '@/lib/nav-items'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getRoleAvatarSrc } from '@/lib/role-avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotificationsPanel } from '@/components/notifications-panel'
import { GlobalSearch } from '@/components/global-search'
import { useOnboardingTour } from '@/features/onboarding/use-onboarding-tour'
import { REPLAY_ADMIN_TOUR_STATE } from '@/features/onboarding/use-admin-tour'
import { buildPageTour, hasPageTour } from '@/features/onboarding/page-tours'
import { JOYRIDE_OPTIONS, tourEnded, tourFinished } from '@/features/onboarding/joyride-options'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABEL } from '@/types/roles'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  const location = useLocation()
  const navigate = useNavigate()
  // Set by "Replay all tutorials": when the app tour finishes, admins carry
  // on into the admin tour.
  const [replayingAll, setReplayingAll] = useState(false)
  const [pageTour, setPageTour] = useState<{ id: number; path: string; steps: Step[] } | null>(null)

  // Leaving the page ends its tour (its targets are gone).
  if (pageTour && pageTour.path !== location.pathname) setPageTour(null)

  function startPageTour() {
    const section = new URLSearchParams(location.search).get('section')
    const steps = buildPageTour(location.pathname, section, user?.role)
    if (steps.length > 0) setPageTour({ id: Date.now(), path: location.pathname, steps })
  }

  function replayAll() {
    setPageTour(null)
    setReplayingAll(true)
    tour.restart()
  }

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
        <DropdownMenuItem onSelect={replayAll}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Replay all tutorials
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
        onEvent={(data) => {
          tour.handleEvent(data)
          if (!replayingAll || !tourEnded(data)) return
          setReplayingAll(false)
          if (tourFinished(data) && user?.role === 'SuperAdmin') navigate('/admin', { state: REPLAY_ADMIN_TOUR_STATE })
        }}
        continuous
        options={JOYRIDE_OPTIONS}
      />
      {pageTour && (
        <Joyride
          key={pageTour.id}
          steps={pageTour.steps}
          run
          onEvent={(data) => {
            if (tourEnded(data)) setPageTour(null)
          }}
          continuous
          options={JOYRIDE_OPTIONS}
        />
      )}

      <aside
        className={`hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-sidebar-border ${collapsed ? 'justify-center' : 'px-4'}`}>
          {collapsed ? <UctShield className="h-8" /> : <BrandLockup />}
        </div>

        <NavList groups={visibleGroups} collapsed={collapsed} />

        <div className={`flex shrink-0 px-3 pb-2 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="size-4" aria-hidden="true" /> : <ChevronsLeft className="size-4" aria-hidden="true" />}
          </button>
        </div>

        <div className="shrink-0 border-t border-sidebar-border">{profileMenu}</div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 p-0 text-sidebar-foreground [&]:bg-sidebar">
          <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between gap-2 border-b border-sidebar-border py-0 pr-3 pl-4">
            <SheetTitle className="sr-only">LabTracker navigation</SheetTitle>
            <BrandLockup />
            <SheetClose
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close navigation"
            >
              <X className="size-4" aria-hidden="true" />
            </SheetClose>
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
            {hasPageTour(location.pathname) && (
              <button
                type="button"
                data-tour="page-tour"
                onClick={startPageTour}
                aria-label="Tour this page"
                title="Tour this page"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleHelp className="size-4.5" aria-hidden="true" />
              </button>
            )}
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
