import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  ClipboardPlus,
  PackagePlus,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useBookings } from '@/features/bookings/use-bookings'
import { StatusIndicator } from '@/features/equipment/status-indicator'
import type { Booking } from '@/features/bookings/types'
import type { Equipment } from '@/features/equipment/types'
import { useAuth } from '@/context/auth-context'
import { ROLE_LABEL, canBookEquipment, type UserRole } from '@/types/roles'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const TODAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const BOOKING_WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const BOOKING_TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

// ---------------------------------------------------------------------------
// Stat tiles
// ---------------------------------------------------------------------------

type Tone = 'navy' | 'blue' | 'available' | 'maintenance'

// The rule along the top carries the tile's meaning; the number itself always
// stays in body ink so it reads the same in every tile and both themes.
const TONE_RULE: Record<Tone, string> = {
  navy: 'bg-primary',
  blue: 'bg-brand-blue',
  available: 'bg-status-available',
  maintenance: 'bg-status-maintenance',
}

const TONE_ICON: Record<Tone, string> = {
  navy: 'text-primary',
  blue: 'text-brand-blue',
  available: 'text-status-available',
  maintenance: 'text-status-maintenance',
}

function StatTile({
  label,
  hint,
  value,
  tone,
  icon: Icon,
  to,
}: {
  label: string
  hint: string
  value: number
  tone: Tone
  icon: LucideIcon
  to: string
}) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <span className={cn('absolute inset-x-0 top-0 h-0.5', TONE_RULE[tone])} aria-hidden="true" />
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn('size-4 shrink-0', TONE_ICON[tone])} aria-hidden="true" />
        {label}
      </span>
      <span className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
        {value}
      </span>
      <span className="mt-1 text-xs text-muted-foreground group-hover:text-foreground">{hint}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

interface QuickAction {
  to: string
  label: string
  description: string
  icon: LucideIcon
  roles?: UserRole[]
  when?: (role: UserRole) => boolean
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: '/equipment?status=Available',
    label: 'Book equipment',
    description: 'Find an available instrument and reserve a slot.',
    icon: CalendarPlus,
    when: canBookEquipment,
  },
  {
    to: '/usage',
    label: 'Record usage',
    description: 'Log a session, including walk-in use.',
    icon: ClipboardPlus,
    roles: ['SuperAdmin', 'ScienceOfficer'],
  },
  {
    to: '/bookings',
    label: 'Review bookings',
    description: 'Approve requests and see what is coming up.',
    icon: CalendarClock,
    roles: ['SuperAdmin', 'ScienceOfficer'],
  },
  {
    to: '/bookings',
    label: 'My bookings',
    description: 'Check, change or cancel your reservations.',
    icon: CalendarClock,
    roles: ['Researcher', 'PrincipalInvestigator'],
  },
  {
    to: '/admin/equipment',
    label: 'Add equipment',
    description: 'Put a new instrument on the booking list.',
    icon: PackagePlus,
    roles: ['SuperAdmin'],
  },
  {
    to: '/reports',
    label: 'Usage reports',
    description: 'See which groups used what this month.',
    icon: BarChart3,
    roles: ['SuperAdmin'],
  },
]

function QuickActions({ role }: { role: UserRole }) {
  const actions = QUICK_ACTIONS.filter(
    (action) => (!action.roles || action.roles.includes(role)) && (!action.when || action.when(role)),
  )

  return (
    <section aria-labelledby="quick-actions-heading" data-tour="quick-actions">
      <h2 id="quick-actions-heading" className="text-base font-semibold text-foreground">
        Quick actions
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ to, label, description, icon: Icon }) => (
          <li key={label}>
            <Link
              to={to}
              className="flex h-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-primary/50 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function Panel({
  id,
  title,
  action,
  children,
}: {
  id: string
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button asChild size="sm" variant="outline" className="mt-2">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}

function UpcomingBookings({ bookings, canBook }: { bookings: Booking[]; canBook: boolean }) {
  return (
    <Panel
      id="upcoming-heading"
      title="Upcoming bookings"
      action={
        bookings.length > 0 ? (
          <Link to="/bookings" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            All bookings
          </Link>
        ) : undefined
      }
    >
      {bookings.length === 0 ? (
        <EmptyPanel
          icon={CalendarClock}
          title="No upcoming bookings"
          description={
            canBook
              ? 'Pick an available instrument to reserve your first slot.'
              : 'New requests will show here as researchers book equipment.'
          }
          action={canBook ? { to: '/equipment?status=Available', label: 'Book equipment' } : undefined}
        />
      ) : (
        <ul className="divide-y divide-border">
          {bookings.map((booking) => {
            const start = new Date(booking.scheduledStart)
            const end = new Date(booking.scheduledEnd)
            return (
              <li key={booking.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-accent py-1 text-accent-foreground">
                  <span className="text-[11px] leading-tight">{BOOKING_WEEKDAY_FORMAT.format(start)}</span>
                  <span className="text-lg leading-tight font-semibold tabular-nums">{start.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{booking.equipmentName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {BOOKING_TIME_FORMAT.format(start)} to {BOOKING_TIME_FORMAT.format(end)}, {booking.roomLabel}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    booking.status === 'Approved'
                      ? 'bg-status-available/15 text-status-available'
                      : 'bg-status-maintenance/15 text-status-maintenance',
                  )}
                >
                  {booking.status === 'Approved' ? 'Approved' : 'Awaiting approval'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function NeedsAttention({ items, total }: { items: Equipment[]; total: number }) {
  return (
    <Panel
      id="attention-heading"
      title="Needs attention"
      action={
        total > items.length ? (
          <Link to="/equipment?status=Faulty" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            See all {total}
          </Link>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyPanel
          icon={CircleCheck}
          title="Everything is in working order"
          description="Instruments reported faulty or sent for maintenance will show here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/equipment/${item.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Wrench className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.roomLabel}</p>
                </div>
                <StatusIndicator status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { user } = useAuth()
  const { data: equipment, isLoading: isEquipmentLoading, isError: isEquipmentError } = useEquipment('All')
  const { data: bookings, isLoading: isBookingsLoading, isError: isBookingsError } = useBookings()
  const isLoading = isEquipmentLoading || isBookingsLoading
  const isError = isEquipmentError || isBookingsError

  const now = new Date()
  const activeBookings = (bookings ?? []).filter((b) => b.status === 'Requested' || b.status === 'Approved')
  const upcoming = activeBookings
    .filter((b) => new Date(b.scheduledEnd) >= now)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
    .slice(0, 5)
  const attention = (equipment ?? []).filter((e) => e.status === 'Faulty' || e.status === 'UnderMaintenance')

  const counts = {
    total: equipment?.length ?? 0,
    available: equipment?.filter((e) => e.status === 'Available').length ?? 0,
    needsAttention: attention.length,
    activeBookings: activeBookings.length,
  }

  const role = user?.role
  const canBook = canBookEquipment(role)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 border-b border-border pb-4" data-tour="page-header">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {greetingFor(now)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {TODAY_FORMAT.format(now)}.{role ? ` You're signed in as ${ROLE_LABEL[role]}.` : ''}
        </p>
      </header>

      {isError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">Couldn't load the latest counts.</p>
            <p className="text-sm text-muted-foreground">
              The numbers below may be out of date. Check that the API is running, then refresh the page.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-tour="dashboard-stats">
          <StatTile label="Equipment" hint="All instruments" value={counts.total} tone="navy" icon={Boxes} to="/equipment" />
          <StatTile
            label="Available"
            hint="Ready to book now"
            value={counts.available}
            tone="available"
            icon={CircleCheck}
            to="/equipment?status=Available"
          />
          <StatTile
            label="Needs attention"
            hint="Faulty or in maintenance"
            value={counts.needsAttention}
            tone="maintenance"
            icon={TriangleAlert}
            to="/equipment?status=Faulty"
          />
          <StatTile
            label="Bookings"
            hint="Requested or approved"
            value={counts.activeBookings}
            tone="blue"
            icon={CalendarClock}
            to="/bookings"
          />
        </div>
      )}

      {role && <QuickActions role={role} />}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-tour="dashboard-panels">
          <UpcomingBookings bookings={upcoming} canBook={canBook} />
          <NeedsAttention items={attention.slice(0, 5)} total={attention.length} />
        </div>
      )}
    </div>
  )
}
