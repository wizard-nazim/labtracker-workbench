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
      trigger={<AddButton>Add department</AddButton>}
      title="Add department"
      submitLabel="Add department"
      onSubmit={handleSubmit}
    >
      <DepartmentFields name={name} setName={setName} code={code} setCode={setCode} />
    </EntityDialog>
  )
}

function EditDepartmentDialog({
  department,
  open,
  onOpenChange,
}: {
  department: Department
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(department.name)
  const [code, setCode] = useState(department.code)
  const update = useUpdateDepartment(department.id)

  async function handleSubmit() {
    await update.mutateAsync({ name, code })
    toast.success(`Updated department "${name}".`)
  }

  return (
    <EntityDialog
      title="Edit department"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DepartmentFields name={name} setName={setName} code={code} setCode={setCode} />
    </EntityDialog>
  )
}

function DepartmentActions({ department }: { department: Department }) {
  const dialog = useRowDialog<'edit'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef} itemName={department.name} actions={[{ label: 'Edit', icon: Pencil, onSelect: () => dialog.show('edit') }]} />
      {dialog.mounted === 'edit' && <EditDepartmentDialog key={dialog.session} department={department} {...dialog.bind('edit')} />}
    </>
  )
}

export function DepartmentsTab() {
  const { data: departments, isLoading, isError } = useDepartments()

  return (
    <AdminSection
      title="Departments"
      description="Departments own equipment and run labs."
      action={<CreateDepartmentDialog />}
    >
      <ResponsiveList
        items={departments}
        isLoading={isLoading}
        isError={isError}
        noun="departments"
        getKey={(d) => d.id}
        empty={{ title: 'No departments yet.', description: 'Add the first department.' }}
        columns={[
          { key: 'name', header: 'Name', cell: (d) => <span className="font-medium text-foreground">{d.name}</span> },
          { key: 'code', header: 'Code', cell: (d) => <span className="text-muted-foreground">{d.code}</span> },
        ]}
        renderCard={(d) => (
          <>
            <p className="font-medium text-foreground">{d.name}</p>
            <p className="text-[13px] text-muted-foreground">Code {d.code}</p>
          </>
        )}
        renderActions={(d) => <DepartmentActions department={d} />}
      />
    </AdminSection>
  )
}
