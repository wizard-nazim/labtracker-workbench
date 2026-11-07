import type { Step } from 'react-joyride'
import type { UserRole } from '@/types/roles'

// The "Tour this page" button's content. Each stop names a data-tour anchor
// and what to say about it; stops whose anchor isn't on screen (no rows yet,
// no Add button for this role) are dropped when the tour starts.
type Stop = [anchor: string, content: string]

interface AdminSectionCopy {
  about: string
  add?: string
  rowMenu?: string
}

interface AdminPageCopy {
  header: string
  sections: Record<string, AdminSectionCopy>
}

const SEARCH = 'Type here to narrow the list down. It searches as you type.'

const ADMIN_PAGES: Record<string, AdminPageCopy> = {
  '/admin/people': {
    header:
      'Everyone LabTracker knows about. Users are logins, principal investigators lead labs, labs group researchers, and researchers are the people who use equipment. When setting up, add PIs first, then labs, then student accounts.',
    sections: {
      users: {
        about:
          'Everyone who can sign in, with their role. A Temporary password badge means they haven’t chosen their own password yet.',
        add: 'Add account creates a student, Science Officer or Super Admin login in one step. A student needs a lab, so add labs first. Give them the temporary password in person; they choose their own when they first sign in.',
        rowMenu:
          'Edit a login, set a new temporary password, or deactivate an account. Deactivating signs them out within about 30 seconds.',
      },
      pis: {
        about: 'Principal investigators lead labs. Each one belongs to a department.',
        add: 'Add a principal investigator. They need a department; give them a password if they should sign in too.',
        rowMenu: 'Edit, archive or delete a principal investigator.',
      },
      labs: {
        about: 'Labs (research groups). Each is led by a principal investigator, and students belong to one or more labs.',
        add: 'Add a lab. It needs a department and the principal investigator who leads it.',
        rowMenu: 'Edit or delete a lab.',
      },
      researchers: {
        about:
          'The people who use equipment: student number, field of study and labs. Accounts made with Add account show up here on their own.',
        add: 'Add a researcher who has no login, for example someone who only appears in usage records.',
        rowMenu: 'Edit a researcher’s details, labs or linked login.',
      },
    },
  },
  '/admin/equipment': {
    header: 'The equipment people can book (Items) and the types it’s grouped by (Types).',
    sections: {
      items: {
        about: 'Every instrument people can book, with its room and status.',
        add: 'Import adds many items from a CSV or Excel file and shows a preview first. Export downloads the list. Add equipment adds one item; it needs a room, a type and a department.',
        rowMenu: 'Edit an item, change its status, or archive or delete it.',
      },
      types: {
        about: 'Types group equipment, for example Centrifuge or Microscope.',
        add: 'Add a type before adding equipment of that kind.',
        rowMenu: 'Rename or delete a type.',
      },
    },
  },
  '/admin/rooms': {
    header: 'Where equipment is kept, and the facilities some rooms belong to.',
    sections: {
      rooms: {
        about: 'Rooms, by building, floor and room number. Each piece of equipment is in one room.',
        add: 'Add a room. It needs a department.',
        rowMenu: 'Edit, archive or delete a room.',
      },
      facilities: {
        about:
          'Facilities group rooms, such as a BSL-2 suite. Science Officers who oversee a facility can approve bookings for the equipment in it.',
        add: 'Add a facility, choose its rooms and who oversees it.',
        rowMenu: 'Edit a facility, its rooms or its overseers.',
      },
    },
  },
  '/admin/requests': {
    header: 'Things people have asked an administrator to do. The Admin page and the bell tell you when something is waiting.',
    sections: {
      pending: {
        about: 'People who used Forgot password on the sign-in page.',
        rowMenu:
          'Assign a new temporary password and give it to the person in person, or dismiss the request if it wasn’t them.',
      },
      history: { about: 'Requests that were dealt with, and who closed them.' },
    },
  },
  '/admin/settings': {
    header: 'Departments, outside organisations, and tools for importing or clearing data.',
    sections: {
      departments: {
        about: 'Departments own rooms, equipment, principal investigators and labs, so add these first.',
        add: 'Add a department.',
        rowMenu: 'Edit or delete a department.',
      },
      external: {
        about: 'Outside organisations and visitors that bookings can be made for.',
        add: 'Add an external contact.',
        rowMenu: 'Edit or delete an external contact.',
      },
      data: { about: 'One-off tools for importing the department’s equipment list or clearing demo data.' },
    },
  },
}

function adminSubpageStops(page: AdminPageCopy, section: string | null): Stop[] {
  const keys = Object.keys(page.sections)
  const copy = page.sections[section && keys.includes(section) ? section : keys[0]]
  return [
    ['page-header', page.header],
    ['page-sections', 'Switch between the lists on this page here.'],
    ['admin-section', copy.about],
    ['list-search', SEARCH],
    ...(copy.add ? ([['admin-add', copy.add]] as Stop[]) : []),
    ...(copy.rowMenu ? ([['row-menu', `Each row has a ⋯ menu. ${copy.rowMenu}`]] as Stop[]) : []),
  ]
}

function stopsFor(pathname: string, section: string | null, role: UserRole | undefined): Stop[] {
  const manager = role === 'SuperAdmin' || role === 'ScienceOfficer'
  switch (pathname) {
    case '/':
      return [
        ['page-header', 'Your dashboard: today’s date and the role you’re signed in as.'],
        ['dashboard-stats', 'How much equipment there is, what’s free now, what needs attention, and active bookings. Click a tile to see that list.'],
        ['quick-actions', 'Shortcuts to the things you do most.'],
        ['dashboard-panels', 'Your next bookings, and equipment that is faulty or being maintained.'],
      ]
    case '/equipment':
      return [
        ['page-header', 'Every instrument in the department, where it is and whether it’s free.'],
        ['page-action', 'Add a new instrument here.'],
        ['list-search', 'Search by name, serial number or room. The filters next to it narrow the list by status or type.'],
        ['list', 'Click an instrument to see its details and book it.'],
      ]
    case '/bookings':
      return [
        [
          'page-header',
          'Bookings and their status. Bookings for people in the department are approved straight away; bookings for external visitors wait for approval.',
        ],
        ['list-search', SEARCH],
        ['list', 'Each booking shows the equipment, the time and its status.'],
        ['row-menu', manager ? 'Approve, reject or cancel a booking from its ⋯ menu.' : 'Cancel a booking from its ⋯ menu.'],
      ]
    case '/usage':
      return [
        ['page-header', 'Records of equipment actually being used.'],
        ['page-action', 'Record a walk-in session for someone who used equipment without booking.'],
        ['list-search', SEARCH],
        ['list', 'Each record shows who used what, and for how long.'],
        ['row-menu', 'Edit or delete a record from its ⋯ menu.'],
      ]
    case '/reports':
      return [
        ['page-header', 'Equipment usage by research group.'],
        ['reports-filters', 'Choose one piece of equipment or all of it, and the month.'],
        ['reports-totals', 'Totals for that choice: sessions, hours and how many groups used it.'],
        ['reports-chart', 'Usage per research group. Switch between sessions and hours at the top right.'],
      ]
    case '/account':
      return [
        ['page-header', 'Your account details and profile.'],
        ['account-password', 'Change your password here. You need your current one, and your other devices are signed out afterwards.'],
      ]
    case '/admin':
      return [
        ['admin-requests', 'Requests, such as forgotten passwords, land here. It stands out while something is waiting.'],
        ['admin-setup', 'Set things up in this order; each step ticks off when it’s done.'],
        ['admin-tiles', 'The four areas you manage. Choose one to see its lists.'],
      ]
    default: {
      const page = ADMIN_PAGES[pathname]
      return page ? adminSubpageStops(page, section) : []
    }
  }
}

export function hasPageTour(pathname: string): boolean {
  return stopsFor(pathname, null, undefined).length > 0
}

// Resolves each stop to the first matching element that is actually on
// screen (lists render both a table and cards; only one is visible).
export function buildPageTour(pathname: string, section: string | null, role: UserRole | undefined): Step[] {
  return stopsFor(pathname, section, role).flatMap(([anchor, content]) => {
    const element = [...document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`)].find(
      (el) => el.getClientRects().length > 0,
    )
    return element ? [{ target: element, content }] : []
  })
}
