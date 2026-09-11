import type { LucideIcon } from 'lucide-react'
import { Boxes, CircleCheck, TriangleAlert, CalendarClock } from 'lucide-react'
import { useEquipment } from '@/features/equipment/use-equipment'
import { useBookings } from '@/features/bookings/use-bookings'
import { useAuth } from '@/context/auth-context'
import { Skeleton } from '@/components/ui/skeleton'

function ReadoutPanel({
  label,
  value,
  accentClass,
  icon: Icon,
}: {
  label: string
  value: number | string
  accentClass: string
  icon: LucideIcon
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} aria-hidden="true" />
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

// The one deliberately "loud" panel on the dashboard — everything else stays
// quiet so this genuinely stands out. Base is solid bg-primary/text-primary-foreground
// (the same pairing our buttons already use, so contrast is correct in both
// themes) with a diagonal sheen layered on top for the gradient feel, rather
// than fading the primary color itself toward transparent — which would break
// contrast in dark mode, where --primary is a light teal meant for dark text.
function HeroReadoutPanel({ label, value, banner, icon: Icon }: { label: string; value: number; banner: string; icon: LucideIcon }) {
  return (
    <div className="relative overflow-hidden rounded-md bg-primary p-5 text-primary-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10"
        aria-hidden="true"
      />
      <span className="absolute top-3 right-3 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium">
        {banner}
      </span>
      <Icon className="relative size-4 opacity-80" aria-hidden="true" />
      <p className="relative mt-2 font-mono text-3xl font-medium tabular-nums">{value}</p>
      <p className="relative mt-1 text-sm opacity-80">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: equipment, isLoading: isEquipmentLoading } = useEquipment('All')
  const { data: bookings, isLoading: isBookingsLoading } = useBookings()
  const isLoading = isEquipmentLoading || isBookingsLoading

  const counts = {
    total: equipment?.length ?? 0,
    available: equipment?.filter((e) => e.status === 'Available').length ?? 0,
    needsAttention: equipment?.filter((e) => e.status === 'Faulty' || e.status === 'UnderMaintenance').length ?? 0,
    activeBookings: bookings?.filter((b) => b.status === 'Requested' || b.status === 'Approved').length ?? 0,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {user?.email} — {user?.role === 'ScienceOfficer' ? 'Science Officer' : user?.role}.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ReadoutPanel label="Total equipment" value={counts.total} accentClass="bg-primary" icon={Boxes} />
          <ReadoutPanel
            label="Available now"
            value={counts.available}
            accentClass="bg-status-available"
            icon={CircleCheck}
          />
          <ReadoutPanel
            label="Needs attention"
            value={counts.needsAttention}
            accentClass="bg-status-maintenance"
            icon={TriangleAlert}
          />
          <HeroReadoutPanel label="Equipment booked" value={counts.activeBookings} banner="Active" icon={CalendarClock} />
        </div>
      )}
    </div>
  )
}
