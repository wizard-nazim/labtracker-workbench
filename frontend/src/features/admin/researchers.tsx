import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { AdminSection } from './admin-section'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TableEmptyState } from '@/components/table-empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
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
    return <Badge className="bg-teal-500/10 text-teal-700 dark:text-teal-300">Science Officer</Badge>
  }
  if (userRole === 'PrincipalInvestigator') {
    return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300">Principal Investigator</Badge>
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
        <Label>Research groups (a student can belong to more than one)</Label>
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
      trigger={<Button size="sm">Add researcher</Button>}
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

function EditResearcherDialog({ researcher }: { researcher: Researcher }) {
  const [open, setOpen] = useState(false)
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
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit researcher"
      submitLabel="Save changes"
      submitDisabled={researchGroupIds.length === 0}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
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

export function ResearchersTab() {
  const { data: researchers, isLoading, isError } = useResearchers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')

  const query = search.trim().toLowerCase()
  const filtered = (researchers ?? []).filter(
    (r) =>
      matchesRoleFilter(r, roleFilter) &&
      (query === '' || r.fullName.toLowerCase().includes(query) || r.studentNumber.toLowerCase().includes(query)),
  )

  return (
    <AdminSection
      title="Researchers"
      description="Students and researchers who use lab equipment."
      action={<CreateResearcherDialog />}
    >
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search by name or student number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="sm:w-56">
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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Student no.</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Field of study</TableHead>
            <TableHead>Research groups</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={7}
              tone="error"
              title="Couldn't load researchers."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && researchers?.length === 0 && (
            <TableEmptyState colSpan={7} title="No researchers yet." />
          )}

          {!isLoading && !isError && researchers && researchers.length > 0 && filtered.length === 0 && (
            <TableEmptyState colSpan={7} title="No researchers match your search." />
          )}

          {filtered.map((researcher) => (
            <TableRow key={researcher.id}>
              <TableCell className="font-medium text-foreground">{researcher.fullName}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{researcher.studentNumber}</TableCell>
              <TableCell>
                <RoleBadge userRole={researcher.userRole} />
              </TableCell>
              <TableCell className="text-muted-foreground">{researcher.fieldOfStudy ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{researcher.researchGroupNames.join(', ')}</TableCell>
              <TableCell className="text-muted-foreground">{researcher.userEmail ?? 'No account yet'}</TableCell>
              <TableCell className="text-right">
                <EditResearcherDialog researcher={researcher} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
