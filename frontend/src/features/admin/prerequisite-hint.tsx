import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

export interface Prerequisite {
  // True once the list has loaded and is empty; nothing shows while loading.
  missing: boolean
  // What to add, e.g. "a department".
  what: string
  to: string
}

// Shown at the top of an Add dialog when something it needs doesn't exist
// yet, with a link to where to add it. See docs/workflows/accounts-and-bookings.md
// for the full setup order.
export function PrerequisiteHint({ items, before }: { items: Prerequisite[]; before: string }) {
  const missing = items.filter((item) => item.missing)
  if (missing.length === 0) return null

  return (
    <div role="note" className="flex gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-[13px] text-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p>
        Add{' '}
        {missing.map((item, i) => (
          <span key={item.to}>
            {i > 0 && (i === missing.length - 1 ? ' and ' : ', ')}
            <Link to={item.to} className="font-medium text-primary underline-offset-2 hover:underline">
              {item.what}
            </Link>
          </span>
        ))}{' '}
        first: {before}
      </p>
    </div>
  )
}

export const SETUP_LINKS = {
  departments: '/admin/settings',
  rooms: '/admin/rooms',
  equipmentTypes: '/admin/equipment?section=types',
  equipment: '/admin/equipment',
  pis: '/admin/people?section=pis',
  labs: '/admin/people?section=labs',
  accounts: '/admin/people',
} as const
