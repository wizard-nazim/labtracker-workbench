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

export interface Department {
  id: number
  name: string
  code: string
}

interface UpsertDepartmentRequest {
  name: string
  code: string
}

export function useDepartments() {
  return useQuery({ queryKey: ['departments'], queryFn: () => apiClient.get<Department[]>('/departments') })
}

function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertDepartmentRequest) => apiClient.post<Department>('/departments', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })
}

function useUpdateDepartment(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertDepartmentRequest) => apiClient.put<Department>(`/departments/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })
}

function DepartmentFields({
  name,
  setName,
  code,
  setCode,
}: {
  name: string
  setName: (v: string) => void
  code: string
  setCode: (v: string) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dept-name">Name</Label>
        <Input id="dept-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dept-code">Code</Label>
        <Input id="dept-code" required value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
    </>
  )
}

function CreateDepartmentDialog() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const create = useCreateDepartment()

  async function handleSubmit() {
    await create.mutateAsync({ name, code })
    toast.success(`Added department "${name}".`)
    setName('')
    setCode('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add department</Button>}
      title="Add department"
      submitLabel="Add department"
      onSubmit={handleSubmit}
    >
      <DepartmentFields name={name} setName={setName} code={code} setCode={setCode} />
    </EntityDialog>
  )
}

function EditDepartmentDialog({ department }: { department: Department }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(department.name)
  const [code, setCode] = useState(department.code)
  const update = useUpdateDepartment(department.id)

  async function handleSubmit() {
    await update.mutateAsync({ name, code })
    toast.success(`Updated department "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit department"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <DepartmentFields name={name} setName={setName} code={code} setCode={setCode} />
    </EntityDialog>
  )
}

export function DepartmentsTab() {
  const { data: departments, isLoading, isError } = useDepartments()

  return (
    <AdminSection
      title="Departments"
      description="Departments that own equipment and organize research groups."
      action={<CreateDepartmentDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={3}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={3}
              tone="error"
              title="Couldn't load departments."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && departments?.length === 0 && (
            <TableEmptyState colSpan={3} title="No departments yet." />
          )}

          {departments?.map((dept) => (
            <TableRow key={dept.id}>
              <TableCell className="font-medium text-foreground">{dept.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{dept.code}</TableCell>
              <TableCell className="text-right">
                <EditDepartmentDialog department={dept} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
