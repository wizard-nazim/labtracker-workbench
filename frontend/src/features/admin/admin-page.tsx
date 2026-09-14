import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Settings, TriangleAlert } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { RoomsTab } from './rooms'
import { CompaniesTab } from './companies'
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
    value: 'companies',
    label: 'Companies',
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

export function AdminPage() {
  const { user } = useAuth()
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-6">
      <PageBanner />

      <PageHeader
        icon={Settings}
        title="Admin"
        description="Manage the master data equipment and bookings depend on."
      />

      <Tabs defaultValue="departments">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={tab.accentClass}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
        <TabsContent value="equipment-types">
          <EquipmentTypesTab />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>

      <DangerZone />
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
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5">
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
