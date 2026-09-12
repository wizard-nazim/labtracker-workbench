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
import { useResearchGroups } from './research-groups'

export interface Researcher {
  id: number
  fullName: string
  studentNumber: string
  researchGroupId: number
  researchGroupName: string
  userId: number | null
  userEmail: string | null
}

interface UpsertResearcherRequest {
  fullName: string
  studentNumber: string
  researchGroupId: number
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
  researchGroupId,
  setResearchGroupId,
}: {
  fullName: string
  setFullName: (v: string) => void
  studentNumber: string
  setStudentNumber: (v: string) => void
  researchGroupId: string
  setResearchGroupId: (v: string) => void
}) {
  const { data: groups } = useResearchGroups()

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
        <Label htmlFor="researcher-group">Research group</Label>
        <Select value={researchGroupId} onValueChange={setResearchGroupId} required>
          <SelectTrigger id="researcher-group">
            <SelectValue placeholder="Select research group" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

function CreateResearcherDialog() {
  const [fullName, setFullName] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [researchGroupId, setResearchGroupId] = useState('')
  const create = useCreateResearcher()

  async function handleSubmit() {
    await create.mutateAsync({ fullName, studentNumber, researchGroupId: Number(researchGroupId) })
    toast.success(`Added researcher "${fullName}".`)
    setFullName('')
    setStudentNumber('')
    setResearchGroupId('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add researcher</Button>}
      title="Add researcher"
      description="Creates a research profile. Linking it to a login account happens separately once the researcher has one."
      submitLabel="Add researcher"
      submitDisabled={!researchGroupId}
      onSubmit={handleSubmit}
    >
      <ResearcherFields
        fullName={fullName}
        setFullName={setFullName}
        studentNumber={studentNumber}
        setStudentNumber={setStudentNumber}
        researchGroupId={researchGroupId}
        setResearchGroupId={setResearchGroupId}
      />
    </EntityDialog>
  )
}

function EditResearcherDialog({ researcher }: { researcher: Researcher }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(researcher.fullName)
  const [studentNumber, setStudentNumber] = useState(researcher.studentNumber)
  const [researchGroupId, setResearchGroupId] = useState(String(researcher.researchGroupId))
  const update = useUpdateResearcher(researcher.id)

  async function handleSubmit() {
    await update.mutateAsync({ fullName, studentNumber, researchGroupId: Number(researchGroupId) })
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
      submitDisabled={!researchGroupId}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <ResearcherFields
        fullName={fullName}
        setFullName={setFullName}
        studentNumber={studentNumber}
        setStudentNumber={setStudentNumber}
        researchGroupId={researchGroupId}
        setResearchGroupId={setResearchGroupId}
      />
    </EntityDialog>
  )
}

export function ResearchersTab() {
  const { data: researchers, isLoading, isError } = useResearchers()

  return (
    <AdminSection
      title="Researchers"
      description="Students and researchers who use lab equipment."
      action={<CreateResearcherDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Student no.</TableHead>
            <TableHead>Research group</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={5}
              tone="error"
              title="Couldn't load researchers."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && researchers?.length === 0 && (
            <TableEmptyState colSpan={5} title="No researchers yet." />
          )}

          {researchers?.map((researcher) => (
            <TableRow key={researcher.id}>
              <TableCell className="font-medium text-foreground">{researcher.fullName}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{researcher.studentNumber}</TableCell>
              <TableCell className="text-muted-foreground">{researcher.researchGroupName}</TableCell>
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
