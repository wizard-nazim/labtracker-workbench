import { useEquipment } from '@/features/equipment/use-equipment'
import { useAuth } from '@/context/auth-context'
import { Skeleton } from '@/components/ui/skeleton'

function ReadoutPanel({ label, value, accentClass }: { label: string; value: number | string; accentClass: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-card p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} aria-hidden="true" />
      <p className="font-mono text-3xl font-medium tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: equipment, isLoading } = useEquipment('All')

  const counts = {
    total: equipment?.length ?? 0,
    available: equipment?.filter((e) => e.status === 'Available').length ?? 0,
    needsAttention: equipment?.filter((e) => e.status === 'Faulty' || e.status === 'UnderMaintenance').length ?? 0,
    retired: equipment?.filter((e) => e.status === 'Retired').length ?? 0,
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
          <ReadoutPanel label="Total equipment" value={counts.total} accentClass="bg-primary" />
          <ReadoutPanel label="Available now" value={counts.available} accentClass="bg-status-available" />
          <ReadoutPanel label="Needs attention" value={counts.needsAttention} accentClass="bg-status-maintenance" />
          <ReadoutPanel label="Retired" value={counts.retired} accentClass="bg-status-retired" />
        </div>
      )}
    </div>
  )
}
