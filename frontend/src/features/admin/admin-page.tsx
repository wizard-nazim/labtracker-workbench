import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Joyride } from 'react-joyride'
import { Settings, TriangleAlert, HelpCircle, FileUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminTour } from '@/features/onboarding/use-admin-tour'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { PageBanner } from '@/components/page-banner'
import { useAuth } from '@/context/auth-context'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
import { DepartmentsTab } from './departments'
import { PrincipalInvestigatorsTab } from './principal-investigators'
import { ResearchGroupsTab } from './research-groups'
import { ResearchersTab } from './researchers'
import { EquipmentTypesTab } from './equipment-types'
import { EquipmentAdminTab } from './equipment-admin-tab'
import { RoomsTab } from './rooms'
import { FacilitiesTab } from './facilities'
import { ExternalTab } from './external'
import { UsersTab } from './users'

// Each tab gets its own accent, distinct from the equipment-status colors
// (green/red/amber/grey) used elsewhere so there's no false association.
// Written as complete literal class strings — Tailwind can't see through
// `text-${accent}-600`-style interpolation at build time.
const TABS = [
  {
    value: 'departments',
    label: 'Departments',
    accentClass:
      'bg-blue-500/10 text-blue-700 dark:text-blue-300 data-active:bg-blue-500/25 data-active:text-blue-700 dark:data-active:text-blue-300',
  },
  {
    value: 'pis',
    label: 'Principal investigators',
    accentClass:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 data-active:bg-purple-500/25 data-active:text-purple-700 dark:data-active:text-purple-300',
  },
  {
    value: 'research-groups',
    label: 'Research groups',
    accentClass:
      'bg-pink-500/10 text-pink-700 dark:text-pink-300 data-active:bg-pink-500/25 data-active:text-pink-700 dark:data-active:text-pink-300',
  },
  {
    value: 'researchers',
    label: 'Researchers',
    accentClass:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 data-active:bg-indigo-500/25 data-active:text-indigo-700 dark:data-active:text-indigo-300',
  },
  {
    value: 'equipment',
    label: 'Equipment',
    accentClass:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 data-active:bg-violet-500/25 data-active:text-violet-700 dark:data-active:text-violet-300',
  },
  {
    value: 'equipment-types',
    label: 'Equipment types',
    accentClass: 'bg-primary/10 text-primary data-active:bg-primary/25 data-active:text-primary',
  },
  {
    value: 'rooms',
    label: 'Rooms',
    accentClass:
      'bg-orange-500/10 text-orange-700 dark:text-orange-300 data-active:bg-orange-500/25 data-active:text-orange-700 dark:data-active:text-orange-300',
  },
  {
    value: 'facilities',
    label: 'Facilities',
    accentClass:
      'bg-teal-500/10 text-teal-700 dark:text-teal-300 data-active:bg-teal-500/25 data-active:text-teal-700 dark:data-active:text-teal-300',
  },
  {
    value: 'external',
    label: 'External',
    accentClass:
      'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 data-active:bg-cyan-500/25 data-active:text-cyan-700 dark:data-active:text-cyan-300',
  },
  {
    value: 'users',
    label: 'Users',
    accentClass:
      'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 data-active:bg-fuchsia-500/25 data-active:text-fuchsia-700 dark:data-active:text-fuchsia-300',
  },
]

const TAB_TOUR_ID: Record<string, string> = {
  departments: 'admin-tab-departments',
  'equipment-types': 'admin-tab-equipment-types',
  facilities: 'admin-tab-facilities',
  users: 'admin-tab-users',
}

export function AdminPage() {
  const { user } = useAuth()
  const demoDataReset = useDemoDataReset(user?.role === 'SuperAdmin')
  const mcbImport = useMcbImport(user?.role === 'SuperAdmin')
  const tour = useAdminTour(demoDataReset)
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-4">
      <Joyride
        steps={tour.steps}
        run={tour.run}
        onEvent={tour.handleEvent}
        continuous
        options={{
          showProgress: true,
          skipBeacon: true,
          buttons: ['back', 'skip', 'primary'],
          primaryColor: 'var(--primary)',
          backgroundColor: 'var(--popover)',
          textColor: 'var(--popover-foreground)',
          arrowColor: 'var(--popover)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />

      <PageBanner src="/banners/admin-banner.jpg" alt="Admin" />

      <PageHeader
        icon={Settings}
        title="Admin"
        description="Manage the master data equipment and bookings depend on."
        action={
          <Button size="sm" variant="outline" onClick={tour.restart}>
            <HelpCircle className="size-4" aria-hidden="true" />
            Take a tour
          </Button>
        }
      />

      <Tabs defaultValue="departments">
        <div className="overflow-x-auto" data-tour="admin-tabs">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-tour={TAB_TOUR_ID[tab.value]}
                className={`${tab.accentClass} shrink-0`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="departments">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="pis">
          <PrincipalInvestigatorsTab />
        </TabsContent>
        <TabsContent value="research-groups">
          <ResearchGroupsTab />
        </TabsContent>
        <TabsContent value="researchers">
          <ResearchersTab />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentAdminTab />
        </TabsContent>
        <TabsContent value="equipment-types">
          <EquipmentTypesTab />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="facilities">
          <FacilitiesTab />
        </TabsContent>
        <TabsContent value="external">
          <ExternalTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>

      {mcbImport && <McbImportCard />}

      {demoDataReset && <DangerZone />}
    </div>
  )
}

// Off outside development (Features:DemoDataReset); the API 404s the reset
// itself when disabled, so this only decides whether to offer it.
function useDemoDataReset(isSuperAdmin: boolean) {
  const { data } = useQuery({
    queryKey: ['admin', 'demo-data-reset'],
    queryFn: () => apiClient.get<{ enabled: boolean }>('/admin/demo-data-reset'),
    staleTime: Infinity,
    enabled: isSuperAdmin,
  })
  return data?.enabled ?? false
}

// Off unless Features:McbImport is set on the API.
function useMcbImport(isSuperAdmin: boolean) {
  const { data } = useQuery({
    queryKey: ['admin', 'mcb-import'],
    queryFn: () => apiClient.get<{ enabled: boolean }>('/admin/mcb-import'),
    staleTime: Infinity,
    enabled: isSuperAdmin,
  })
  return data?.enabled ?? false
}

interface McbImportResult {
  equipmentCreated: number
  typesCreated: number
  roomsCreated: number
  facilitiesCreated: number
  scienceOfficersCreated: number
}

function McbImportCard() {
  const queryClient = useQueryClient()
  const [isImporting, setIsImporting] = useState(false)

  async function handleImport() {
    setIsImporting(true)
    try {
      const r = await apiClient.post<McbImportResult>('/admin/import-mcb-equipment')
      toast.success(
        `Imported ${r.equipmentCreated} equipment, ${r.typesCreated} types, ${r.roomsCreated} rooms, ` +
          `${r.facilitiesCreated} facilities and ${r.scienceOfficersCreated} science officers.`,
      )
      await queryClient.invalidateQueries()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="rounded-md border p-5">
      <div className="flex items-center gap-2">
        <FileUp className="size-4" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Import MCB equipment</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Adds the Molecular and Cell Biology equipment list: 67 items with their types, rooms, BSL2 facilities and
        science officers. It can only be imported once. Science officers are added as inactive accounts with
        placeholder emails. Set each one's real email under Users, then activate them.
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="mt-4" disabled={isImporting}>
            {isImporting ? 'Importing…' : 'Import MCB equipment'}
          </Button>
        }
        title="Import the MCB equipment list?"
        description="This adds 67 equipment items and the types, rooms, facilities and science officer accounts they need."
        confirmLabel="Import"
        onConfirm={handleImport}
      />
    </div>
  )
}

function DangerZone() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isResetting, setIsResetting] = useState(false)

  async function handleReset() {
    setIsResetting(true)
    try {
      await apiClient.post('/admin/reset-demo-data')
      toast.success('Demo data reset. Please sign in again.')
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(apiErrorMessage(err))
      setIsResetting(false)
    }
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5" data-tour="danger-zone">
      <div className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <h2 className="text-sm font-semibold">Danger zone</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently delete all equipment, bookings, research data, and user accounts, then recreate only the 3
        default logins. Use this to clear demo data before entering a real client's data.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4" disabled={isResetting}>
            {isResetting ? 'Resetting…' : 'Reset demo data'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all equipment, bookings, research data, and user accounts, and recreates only
              the 3 default logins. This cannot be undone, and you'll need to sign in again afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleReset}>
              Reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
