import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  DoorOpen,
  FlaskConical,
  HelpCircle,
  Inbox,
  Settings,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEquipment } from '@/features/equipment/use-equipment'
import type { AdminTour } from './admin-layout'
import { useDepartments } from './departments'
import { useEquipmentTypes } from './equipment-types'
import { usePrincipalInvestigators } from './principal-investigators'
import { SETUP_LINKS } from './prerequisite-hint'
import { usePendingRequestCount } from './requests'
import { useResearchGroups } from './research-groups'
import { useRooms } from './rooms'
import { useUsers } from './users'

function countLabel(count: number | undefined, one: string, many: string) {
  if (count === undefined) return null
  return `${count} ${count === 1 ? one : many}`
}

// /admin: the Requests inbox, a setup checklist until LabTracker is set up,
// and four areas, each opening a simple list.
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
      description: 'Accounts, principal investigators, labs and researchers.',
      count: countLabel(users?.length, 'account', 'accounts'),
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

      <RequestsCard />
      <SetupChecklist />

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

// Full width above the tiles so the 2×2 grid stays even. Stands out only
// while something is waiting.
function RequestsCard() {
  const { data: pending } = usePendingRequestCount()
  const waiting = (pending ?? 0) > 0

  return (
    <Link
      to="/admin/requests"
      data-tour="admin-requests"
      className="group/tile block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <Card
        className={`flex-row items-center gap-4 px-4 py-4 transition-colors group-hover/tile:ring-primary/40 sm:px-5 ${
          waiting ? 'bg-primary/5 ring-primary/40' : ''
        }`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Inbox className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold text-foreground">Requests</span>
          <span className="text-[13px] text-muted-foreground">
            {pending === undefined
              ? 'Password resets people have asked for.'
              : waiting
                ? `${pending} password ${pending === 1 ? 'reset is' : 'resets are'} waiting for you.`
                : 'Nothing waiting. Password resets people ask for appear here.'}
          </span>
        </span>
        {waiting && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground tabular-nums">
            {pending}
          </span>
        )}
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/tile:translate-x-0.5"
          aria-hidden="true"
        />
      </Card>
    </Link>
  )
}

const CHECKLIST_DISMISSED_KEY = 'labtracker.admin-setup-dismissed'

function readDismissed() {
  try {
    return localStorage.getItem(CHECKLIST_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

interface SetupStep {
  label: string
  hint: string
  to: string
  // undefined while loading.
  done: boolean | undefined
}

// The order things have to exist in (docs/workflows/accounts-and-bookings.md).
// Each step ticks itself from the lists the hub loads; it goes away once
// everything is done, or when dismissed on this browser.
function SetupChecklist() {
  const [dismissed, setDismissed] = useState(readDismissed)
  const { data: departments } = useDepartments()
  const { data: rooms } = useRooms()
  const { data: types } = useEquipmentTypes()
  const { data: equipment } = useEquipment('All')
  const { data: pis } = usePrincipalInvestigators()
  const { data: labs } = useResearchGroups()
  const { data: users } = useUsers()

  const has = (list: unknown[] | undefined) => (list === undefined ? undefined : list.length > 0)
  const steps: SetupStep[] = [
    { label: 'Add a department', hint: 'Admin › Settings', to: SETUP_LINKS.departments, done: has(departments) },
    { label: 'Add rooms', hint: 'where equipment is kept', to: SETUP_LINKS.rooms, done: has(rooms) },
    { label: 'Add equipment types', hint: 'e.g. Centrifuge, Microscope', to: SETUP_LINKS.equipmentTypes, done: has(types) },
    { label: 'Add equipment', hint: 'needs a room, a type and a department', to: SETUP_LINKS.equipment, done: has(equipment) },
    { label: 'Add principal investigators', hint: 'needs a department', to: SETUP_LINKS.pis, done: has(pis) },
    { label: 'Add labs', hint: 'needs a department and a PI', to: SETUP_LINKS.labs, done: has(labs) },
    {
      label: 'Add student and Science Officer accounts',
      hint: 'students need a lab',
      to: SETUP_LINKS.accounts,
      done: users === undefined ? undefined : users.some((u) => u.role !== 'SuperAdmin'),
    },
  ]

  if (dismissed || steps.some((s) => s.done === undefined) || steps.every((s) => s.done)) return null

  const doneCount = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, '1')
    } catch {
      // Private mode: it just comes back next visit.
    }
  }

  return (
    <Card className="gap-3 px-4 py-4 sm:px-5" data-tour="admin-setup">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Getting started</h2>
          <p className="text-[13px] text-muted-foreground">
            Set things up in this order: each step needs the ones above it. {doneCount} of {steps.length} done.
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label="Hide the getting started checklist">
          <X aria-hidden="true" />
        </Button>
      </div>
      <ol className="flex flex-col">
        {steps.map((step) => {
          const Icon = step.done ? CheckCircle2 : Circle
          const isNext = step === next
          return (
            <li key={step.label}>
              <Link
                to={step.to}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icon
                  className={`size-4 shrink-0 ${step.done ? 'text-primary' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span className={step.done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>
                    {step.label}
                  </span>
                  <span className="text-muted-foreground"> · {step.hint}</span>
                  <span className="sr-only">{step.done ? ' (done)' : isNext ? ' (next)' : ''}</span>
                </span>
                {isNext && <span className="text-xs font-medium text-primary">Next</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </Card>
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
