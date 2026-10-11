import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useResearchGroups } from './research-groups'
import { useUsers } from './users'
import { FIELD_OF_STUDY_OPTIONS, type FieldOfStudy } from '@/types/field-of-study'
import type { UserRole } from '@/types/roles'

export interface Researcher {
  id: number
  fullName: string
  studentNumber: string
  fieldOfStudy: FieldOfStudy | null
  researchGroupIds: number[]
  researchGroupNames: string[]
  userId: number | null
  userEmail: string | null
  userRole: UserRole | null
}

type RoleFilter = 'All' | 'Student' | 'ScienceOfficer' | 'PrincipalInvestigator'

const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  All: 'All roles',
  Student: 'Student',
  ScienceOfficer: 'Science Officer',
  PrincipalInvestigator: 'Principal Investigator',
}

// Only the "special" linked-account roles get a highlighted badge — a plain
// Researcher account (or no linked account at all) is just a student, the
// baseline case, so it stays as quiet text rather than a badge.
function RoleBadge({ userRole }: { userRole: UserRole | null }) {
  if (userRole === 'ScienceOfficer') {
    return <Badge variant="secondary">Science Officer</Badge>
  }
  if (userRole === 'PrincipalInvestigator') {
    return <Badge variant="secondary">Principal Investigator</Badge>
  }
  return <span className="text-muted-foreground">Student</span>
}

interface UpsertResearcherRequest {
  fullName: string
  studentNumber: string
  fieldOfStudy?: FieldOfStudy
  researchGroupIds: number[]
  userId?: number
}

export function useResearchers() {
  return useQuery({ queryKey: ['researchers'], queryFn: () => apiClient.get<Researcher[]>('/researchers') })
}

function useCreateResearcher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertResearcherRequest) => apiClient.post<Researcher>('/researchers', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['researchers'] }),
  })
}

function useUpdateResearcher(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertResearcherRequest) => apiClient.put<Researcher>(`/researchers/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['researchers'] }),
  })
}

function ResearcherFields({
  fullName,
  setFullName,
  studentNumber,
  setStudentNumber,
  fieldOfStudy,
  setFieldOfStudy,
  researchGroupIds,
  setResearchGroupIds,
  userId,
  setUserId,
  currentResearcherId,
}: {
  fullName: string
  setFullName: (v: string) => void
  studentNumber: string
  setStudentNumber: (v: string) => void
  fieldOfStudy: string
  setFieldOfStudy: (v: FieldOfStudy | '') => void
  researchGroupIds: number[]
  setResearchGroupIds: (v: number[]) => void
  userId: string
  setUserId: (v: string) => void
  currentResearcherId?: number
}) {
  const { data: groups } = useResearchGroups()
  const { data: users } = useUsers()
  const { data: researchers } = useResearchers()

  // A user can only be linked to one Researcher profile at a time (enforced by
  // a unique index) — exclude users already linked to a *different* researcher,
  // but keep this researcher's own current link selectable when editing.
  const linkedElsewhere = new Set(
    (researchers ?? []).filter((r) => r.id !== currentResearcherId && r.userId).map((r) => r.userId),
  )
  const linkableUsers = (users ?? []).filter((u) => u.role !== 'SuperAdmin' && !linkedElsewhere.has(u.id))

  function toggleGroup(id: number) {
    setResearchGroupIds(
      researchGroupIds.includes(id) ? researchGroupIds.filter((g) => g !== id) : [...researchGroupIds, id],
    )
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="researcher-name">Full name</Label>
        <Input id="researcher-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="researcher-student-number">Student number</Label>
        <Input
          id="researcher-student-number"
          required
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="researcher-field-of-study">Field of study (optional)</Label>
        <Select
          value={fieldOfStudy || 'none'}
          onValueChange={(v) => setFieldOfStudy(v === 'none' ? '' : (v as FieldOfStudy))}
        >
          <SelectTrigger id="researcher-field-of-study">
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {FIELD_OF_STUDY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="researcher-user">Linked account (optional)</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger id="researcher-user">
            <SelectValue placeholder="No account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No account</SelectItem>
            {linkableUsers.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Labs (choose at least one)</Label>
        <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2">
          {groups?.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={researchGroupIds.includes(group.id)}
                onChange={() => toggleGroup(group.id)}
              />
              {group.name}
            </label>
          ))}
        </div>
      </div>
    </>
  )
}

function CreateResearcherDialog() {
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState<FieldOfStudy | ''>('')
  const [researchGroupIds, setResearchGroupIds] = useState<number[]>([])
  const [userId, setUserId] = useState('')
  const create = useCreateResearcher()

  async function handleSubmit() {
    await create.mutateAsync({
      fullName,
      studentNumber,
      fieldOfStudy: fieldOfStudy || undefined,
      researchGroupIds,
      userId: userId && userId !== 'none' ? Number(userId) : undefined,
    })
    toast.success(`Added researcher "${fullName}".`)
    setFullName('')
    setStudentNumber('')
    setFieldOfStudy('')
    setResearchGroupIds([])
    setUserId('')
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add researcher</AddButton>}
      title="Add researcher"
      description="Creates a research profile, optionally linked to an existing login account."
      submitLabel="Add researcher"
      submitDisabled={researchGroupIds.length === 0}
      onSubmit={handleSubmit}
    >
      <ResearcherFields
        fullName={fullName}
        setFullName={setFullName}
        studentNumber={studentNumber}
        setStudentNumber={setStudentNumber}
        fieldOfStudy={fieldOfStudy}
        setFieldOfStudy={setFieldOfStudy}
        researchGroupIds={researchGroupIds}
        setResearchGroupIds={setResearchGroupIds}
        userId={userId}
        setUserId={setUserId}
      />
    </EntityDialog>
  )
}

function EditResearcherDialog({
  researcher,
  open,
  onOpenChange,
}: {
  researcher: Researcher
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [fullName, setFullName] = useState(researcher.fullName)
  const [studentNumber, setStudentNumber] = useState(researcher.studentNumber)
  const [fieldOfStudy, setFieldOfStudy] = useState<FieldOfStudy | ''>(researcher.fieldOfStudy ?? '')
  const [researchGroupIds, setResearchGroupIds] = useState<number[]>(researcher.researchGroupIds)
  const [userId, setUserId] = useState(researcher.userId ? String(researcher.userId) : 'none')
  const update = useUpdateResearcher(researcher.id)

  async function handleSubmit() {
    await update.mutateAsync({
      fullName,
      studentNumber,
      fieldOfStudy: fieldOfStudy || undefined,
      researchGroupIds,
      userId: userId && userId !== 'none' ? Number(userId) : undefined,
    })
    toast.success(`Updated researcher "${fullName}".`)
  }

  return (
    <EntityDialog
      title="Edit researcher"
      submitLabel="Save changes"
      submitDisabled={researchGroupIds.length === 0}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ResearcherFields
        fullName={fullName}
        setFullName={setFullName}
        studentNumber={studentNumber}
        setStudentNumber={setStudentNumber}
        fieldOfStudy={fieldOfStudy}
        setFieldOfStudy={setFieldOfStudy}
        researchGroupIds={researchGroupIds}
        setResearchGroupIds={setResearchGroupIds}
        userId={userId}
        setUserId={setUserId}
        currentResearcherId={researcher.id}
      />
    </EntityDialog>
  )
}

function matchesRoleFilter(researcher: Researcher, filter: RoleFilter) {
  if (filter === 'All') return true
  if (filter === 'Student') return researcher.userRole !== 'ScienceOfficer' && researcher.userRole !== 'PrincipalInvestigator'
  return researcher.userRole === filter
}

function ResearcherActions({ researcher }: { researcher: Researcher }) {
  const dialog = useRowDialog<'edit'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={researcher.fullName}
        actions={[{ label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') }]}
      />
      {dialog.mounted === 'edit' && <EditResearcherDialog key={dialog.session} researcher={researcher} {...dialog.bind('edit')} />}
    </>
  )
}

export function ResearchersTab() {
  const { data: researchers, isLoading, isError } = useResearchers()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')
  const filtered = researchers?.filter((r) => matchesRoleFilter(r, roleFilter))

  return (
    <AdminSection
      title="Researchers"
      description="Students and staff who book and use equipment."
      action={<CreateResearcherDialog />}
    >
      <ResponsiveList
        items={filtered}
        isLoading={isLoading}
        isError={isError}
        noun="researchers"
        getKey={(r) => r.id}
        search={{
          label: 'Search researchers',
          placeholder: 'Search by name or student number',
          text: (r) => `${r.fullName} ${r.studentNumber} ${r.userEmail ?? ''}`,
        }}
        toolbar={
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="h-9 w-full sm:w-48" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_FILTER_LABEL) as RoleFilter[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {ROLE_FILTER_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        empty={
          roleFilter === 'All'
            ? { title: 'No researchers yet.', description: 'Add the first researcher and choose their lab.' }
            : { title: `No researchers with the role ${ROLE_FILTER_LABEL[roleFilter]}.`, description: 'Choose All roles to see everyone.' }
        }
        columns={[
          { key: 'name', header: 'Name', cell: (r) => <span className="font-medium text-foreground">{r.fullName}</span> },
          {
            key: 'student',
            header: 'Student no.',
            cell: (r) => <span className="text-muted-foreground tabular-nums">{r.studentNumber}</span>,
          },
          { key: 'role', header: 'Role', cell: (r) => <RoleBadge userRole={r.userRole} /> },
          {
            key: 'labs',
            header: 'Labs',
            className: 'hidden lg:table-cell',
            cell: (r) => <span className="text-muted-foreground">{r.researchGroupNames.join(', ')}</span>,
          },
          {
            key: 'account',
            header: 'Login',
            className: 'hidden xl:table-cell',
            cell: (r) => <span className="text-muted-foreground wrap-anywhere">{r.userEmail ?? 'No login yet'}</span>,
          },
        ]}
        renderCard={(r) => (
          <>
            <p className="font-medium text-foreground">{r.fullName}</p>
            <p className="text-[13px] text-muted-foreground">
              <span className="tabular-nums">{r.studentNumber}</span>
              {r.researchGroupNames.length > 0 && `, ${r.researchGroupNames.join(', ')}`}
            </p>
            <div className="text-[13px]">
              <RoleBadge userRole={r.userRole} />
            </div>
          </>
        )}
        renderActions={(r) => <ResearcherActions researcher={r} />}
      />
    </AdminSection>
  )
}
