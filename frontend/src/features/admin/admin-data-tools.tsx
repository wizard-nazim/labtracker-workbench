import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileUp, TriangleAlert } from 'lucide-react'
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
import { useAuth } from '@/context/auth-context'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'

// Off outside development (Features:DemoDataReset); the API 404s the reset
// itself when disabled, so this only decides whether to offer it.
export function useDemoDataReset(isSuperAdmin: boolean) {
  const { data } = useQuery({
    queryKey: ['admin', 'demo-data-reset'],
    queryFn: () => apiClient.get<{ enabled: boolean }>('/admin/demo-data-reset'),
    staleTime: Infinity,
    enabled: isSuperAdmin,
  })
  return data?.enabled ?? false
}

// Off unless Features:McbImport is set on the API.
export function useMcbImport(isSuperAdmin: boolean) {
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

export function McbImportCard() {
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
    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <FileUp className="size-4" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Import MCB equipment</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Adds the Molecular and Cell Biology equipment list: 67 items with their types, rooms, BSL2 facilities and
        science officers. It can only be imported once. Science officers are added as inactive accounts with
        placeholder emails. Set each one's real email under People, then Users, and activate them.
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="outline" className="mt-4 w-full sm:w-auto" disabled={isImporting}>
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

export function DangerZone() {
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
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        <h3 className="text-base font-semibold">Reset demo data</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Deletes all equipment, bookings, research data and user accounts, then recreates only the 3 default logins.
        Use it to clear demo data before entering real data. Only available while testing.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4 w-full sm:w-auto" disabled={isResetting}>
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
