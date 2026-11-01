import { Link, useOutletContext } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, DoorOpen, FlaskConical, HelpCircle, Settings, SlidersHorizontal, Users } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEquipment } from '@/features/equipment/use-equipment'
import type { AdminTour } from './admin-layout'
import { useDepartments } from './departments'
import { useRooms } from './rooms'
import { useUsers } from './users'

function countLabel(count: number | undefined, one: string, many: string) {
  if (count === undefined) return null
  return `${count} ${count === 1 ? one : many}`
}

// /admin: four areas, each opening a simple list.
export function AdminPage() {
  const tour = useOutletContext<AdminTour>()
  const { data: equipment } = useEquipment('All')
  const { data: rooms } = useRooms()
  const { data: users } = useUsers()
  const { data: departments } = useDepartments()

  const tiles: AdminTileProps[] = [
    {
      to: '/admin/equipment',
      icon: FlaskConical,
      title: 'Equipment',
      description: 'Items, their types, photos and status.',
      count: countLabel(equipment?.length, 'item', 'items'),
    },
    {
      to: '/admin/rooms',
      icon: DoorOpen,
      title: 'Rooms',
      description: 'Rooms and shared facilities such as BSL2 suites.',
      count: countLabel(rooms?.length, 'room', 'rooms'),
    },
    {
      to: '/admin/people',
      icon: Users,
      title: 'People',
      description: 'Logins, principal investigators, labs and researchers.',
      count: countLabel(users?.length, 'user', 'users'),
    },
    {
      to: '/admin/settings',
      icon: SlidersHorizontal,
      title: 'Settings',
      description: 'Departments, external contacts and data tools.',
      count: countLabel(departments?.length, 'department', 'departments'),
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader
        icon={Settings}
        title="Admin"
        description="Set up the equipment, rooms and people that bookings depend on."
        action={
          <Button size="sm" variant="outline" onClick={tour.restart}>
            <HelpCircle aria-hidden="true" />
            Take a tour
          </Button>
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2" data-tour="admin-tiles">
        {tiles.map((tile) => (
          <li key={tile.to}>
            <AdminTile {...tile} />
          </li>
        ))}
      </ul>
    </div>
  )
}

interface AdminTileProps {
  to: string
  icon: LucideIcon
  title: string
  description: string
  count: string | null
}

function AdminTile({ to, icon: Icon, title, description, count }: AdminTileProps) {
  return (
    <Link
      to={to}
      className="group/tile block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <Card className="h-full flex-row items-start gap-4 px-4 transition-colors group-hover/tile:ring-primary/40 sm:px-5 sm:py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base font-semibold text-foreground">{title}</span>
          <span className="text-[13px] text-muted-foreground">{description}</span>
          {count && <span className="mt-1 text-sm font-medium text-foreground tabular-nums">{count}</span>}
        </span>
        <ChevronRight
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover/tile:translate-x-0.5"
          aria-hidden="true"
        />
      </Card>
    </Link>
  )
}
