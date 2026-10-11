import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Gauge, Boxes, CircleCheck, TriangleAlert, CalendarClock, AlertCircle } from 'lucide-react'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useBookings } from '@/features/bookings/use-bookings'
import { useAuth } from '@/context/auth-context'
import { ROLE_LABEL } from '@/types/roles'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/page-header'

type Tone = 'primary' | 'available' | 'maintenance'

const TILE_TONES: Record<Tone, { accent: string; tint: string; border: string; hoverBorder: string }> = {
  primary: {
    accent: 'bg-primary',
    tint: 'bg-card',
    border: 'border-border',
    hoverBorder: 'hover:border-primary/60',
  },
  available: {
    accent: 'bg-status-available',
    tint: 'bg-card',
    border: 'border-border',
    hoverBorder: 'hover:border-status-available/60',
  },
  maintenance: {
    accent: 'bg-status-maintenance',
    tint: 'bg-card',
    border: 'border-border',
    hoverBorder: 'hover:border-status-maintenance/60',
  },
}

function ReadoutPanel({
  label,
  value,
  tone,
  icon: Icon,
  to,
}: {
  label: string
  value: number | string
  tone: Tone
  icon: LucideIcon
  to: string
}) {
  const { accent, tint, border, hoverBorder } = TILE_TONES[tone]

  return (
    <Link
      to={to}
      className={`relative block overflow-hidden rounded-md border p-5 transition-colors ${border} ${tint} ${hoverBorder} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden="true" />
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  )
}

// The one deliberately "loud" panel on the dashboard — everything else stays
// quiet so this genuinely stands out. Base is solid bg-primary/text-primary-foreground
// (the same pairing our buttons already use, so contrast is correct in both
// themes) with a diagonal sheen layered on top for the gradient feel, rather
// than fading the primary color itself toward transparent — which would break
// contrast in dark mode, where --primary is a light teal meant for dark text.
function HeroReadoutPanel({
  label,
  value,
  banner,
  icon: Icon,
  to,
}: {
  label: string
  value: number
  banner: string
  icon: LucideIcon
  to: string
}) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-md bg-primary p-5 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[400%]"
        aria-hidden="true"
      />
      <span className="absolute top-3 right-3 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
        {banner}
      </span>
      <div className="relative inline-flex size-8 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
        <Icon className="size-4 opacity-80" aria-hidden="true" />
      </div>
      <p className="relative mt-2 font-mono text-3xl font-medium tabular-nums">{value}</p>
      <p className="relative mt-1 text-sm opacity-80">{label}</p>
    </Link>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: equipment, isLoading: isEquipmentLoading, isError: isEquipmentError } = useEquipment('All')
  const { data: bookings, isLoading: isBookingsLoading, isError: isBookingsError } = useBookings()
  const isLoading = isEquipmentLoading || isBookingsLoading
  const isError = isEquipmentError || isBookingsError

  const counts = {
    total: equipment?.length ?? 0,
    available: equipment?.filter((e) => e.status === 'Available').length ?? 0,
    needsAttention: equipment?.filter((e) => e.status === 'Faulty' || e.status === 'UnderMaintenance').length ?? 0,
    activeBookings: bookings?.filter((b) => b.status === 'Requested' || b.status === 'Approved').length ?? 0,
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={Gauge}
        title="Overview"
        description={user ? `Signed in as ${user.email}, ${ROLE_LABEL[user.role]}.` : ''}
      />

      {isError && (
        <div role="alert" className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ReadoutPanel label="Total equipment" value={counts.total} tone="primary" icon={Boxes} to="/equipment" />
          <ReadoutPanel
            label="Available now"
            value={counts.available}
            tone="available"
            icon={CircleCheck}
            to="/equipment?status=Available"
          />
          <ReadoutPanel
            label="Needs attention"
            value={counts.needsAttention}
            tone="maintenance"
            icon={TriangleAlert}
            to="/equipment?status=Faulty"
          />
          <HeroReadoutPanel
            label="Equipment booked"
            value={counts.activeBookings}
            banner="Active"
            icon={CalendarClock}
            to="/bookings"
          />
        </div>
      )}
    </div>
  )
}
