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

interface EquipmentType {
  id: number
  name: string
}

interface UpsertEquipmentTypeRequest {
  name: string
}

function useEquipmentTypes() {
  return useQuery({ queryKey: ['equipment-types'], queryFn: () => apiClient.get<EquipmentType[]>('/equipment-types') })
}

function useCreateEquipmentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertEquipmentTypeRequest) => apiClient.post<EquipmentType>('/equipment-types', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment-types'] }),
  })
}

function useUpdateEquipmentType(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpsertEquipmentTypeRequest) => apiClient.put<EquipmentType>(`/equipment-types/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment-types'] }),
  })
}

function CreateEquipmentTypeDialog() {
  const [name, setName] = useState('')
  const create = useCreateEquipmentType()

  async function handleSubmit() {
    await create.mutateAsync({ name })
    toast.success(`Added equipment type "${name}".`)
    setName('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add type</Button>}
      title="Add equipment type"
      submitLabel="Add type"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type-name">Name</Label>
        <Input id="type-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function EditEquipmentTypeDialog({ equipmentType }: { equipmentType: EquipmentType }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(equipmentType.name)
  const update = useUpdateEquipmentType(equipmentType.id)

  async function handleSubmit() {
    await update.mutateAsync({ name })
    toast.success(`Updated equipment type "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit equipment type"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-type-name">Name</Label>
        <Input id="edit-type-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

export function EquipmentTypesTab() {
  const { data: types, isLoading, isError } = useEquipmentTypes()

  return (
    <AdminSection
      title="Equipment types"
      description="Categories used to classify equipment, e.g. Centrifuge, Microscope."
      action={<CreateEquipmentTypeDialog />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={2}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {isError && (
            <TableEmptyState
              colSpan={2}
              tone="error"
              title="Couldn't load equipment types."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && types?.length === 0 && <TableEmptyState colSpan={2} title="No equipment types yet." />}

          {types?.map((type) => (
            <TableRow key={type.id}>
              <TableCell className="font-medium text-foreground">{type.name}</TableCell>
              <TableCell className="text-right">
                <EditEquipmentTypeDialog equipmentType={type} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
