import { UserRound, FlaskConical, Beaker } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from './use-me'

const ROLE_LABEL: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  ScienceOfficer: 'Science Officer',
  Researcher: 'Researcher',
  PrincipalInvestigator: 'Principal Investigator',
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function AccountPage() {
  const { data: me, isLoading, isError } = useMe()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-40 w-full rounded-md" />
      </div>
    )
  }

  if (isError || !me) {
    return <p className="text-sm text-muted-foreground">Couldn't load your account details. Try again.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={UserRound} title="My account" description="Your account details and profile." />

      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-foreground">Account</h2>
          <Badge variant={me.isActive ? 'secondary' : 'outline'}>{me.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoField label="Email" value={me.email} />
          <InfoField label="Role" value={ROLE_LABEL[me.role] ?? me.role} />
          <InfoField label="Member since" value={formatDate(me.createdAt)} />
        </div>
      </div>

      {me.researcherProfile && (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">Researcher profile</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoField label="Student number" value={me.researcherProfile.studentNumber} />
            <InfoField label="Field of study" value={me.researcherProfile.fieldOfStudy ?? '—'} />
            <InfoField
              label="Research groups"
              value={me.researcherProfile.researchGroupNames.length > 0 ? me.researcherProfile.researchGroupNames.join(', ') : '—'}
            />
          </div>
        </div>
      )}

      {me.principalInvestigatorProfile && (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Beaker className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-medium text-foreground">Principal Investigator profile</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoField label="Department" value={me.principalInvestigatorProfile.departmentName} />
            <InfoField label="Equipment permissions" value={me.principalInvestigatorProfile.hasEquipmentPermissions ? 'Yes' : 'No'} />
          </div>
        </div>
      )}
    </div>
  )
}
