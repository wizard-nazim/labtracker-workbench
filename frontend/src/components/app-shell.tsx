import { Outlet, NavLink } from 'react-router-dom'
import { Gauge, FlaskConical, LogOut } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: Gauge, end: true },
  { to: '/equipment', label: 'Equipment', icon: FlaskConical, end: false },
]

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  ScienceOfficer: 'Science Officer',
  Researcher: 'Researcher',
}

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-svh bg-background">
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border py-4">
        <div className="mb-4 flex size-8 items-center justify-center text-primary" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="size-5">
            <path
              d="M9 3v6.5L4.5 17a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L15 9.5V3M9 3h6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border px-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{user?.email.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
