import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { useEquipment } from '@/features/equipment/use-equipment'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { apiErrorMessage } from '@/lib/api-error-message'

export interface EquipmentType {
  id: number
  name: string
}

interface UpsertEquipmentTypeRequest {
  name: string
}

export function useEquipmentTypes() {
  return useQuery({ queryKey: ['equipment-types'], queryFn: () => apiClient.get<EquipmentType[]>('/equipment-types') })
}

export function useCreateEquipmentType() {
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

function useDeleteEquipmentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<void>(`/equipment-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment-types'] }),
  })
}

function DeleteEquipmentTypeDialog({
  equipmentType,
  open,
  onOpenChange,
}: {
  equipmentType: EquipmentType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteEquipmentType()

  async function handleDelete() {
    try {
      await remove.mutateAsync(equipmentType.id)
      toast.success(`Deleted type "${equipmentType.name}".`)
    } catch (err) {
      toast.error(`Couldn't delete "${equipmentType.name}". ${apiErrorMessage(err)}`)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete "${equipmentType.name}"?`}
      description="Only types that no equipment uses can be deleted. This can't be undone."
      confirmLabel="Delete type"
      destructive
      onConfirm={handleDelete}
    />
  )
}

function CreateEquipmentTypeDialog() {
  const [name, setName] = useState('')
  const create = useCreateEquipmentType()

  async function handleSubmit() {
    await create.mutateAsync({ name })
    toast.success(`Added type "${name}".`)
    setName('')
  }

  return (
    <EntityDialog trigger={<AddButton>Add type</AddButton>} title="Add type" submitLabel="Add type" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type-name">Name</Label>
        <Input id="type-name" required value={name} onChange={(e) => setName(e.target.value)} aria-describedby="type-name-hint" />
        <p id="type-name-hint" className="text-xs text-muted-foreground">
          For example: Centrifuge, Microscope.
        </p>
      </div>
    </EntityDialog>
  )
}

function RenameEquipmentTypeDialog({
  equipmentType,
  open,
  onOpenChange,
}: {
  equipmentType: EquipmentType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(equipmentType.name)
  const update = useUpdateEquipmentType(equipmentType.id)

  async function handleSubmit() {
    await update.mutateAsync({ name })
    toast.success(`Renamed to "${name}".`)
  }

  return (
    <EntityDialog title="Rename type" submitLabel="Save name" onSubmit={handleSubmit} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-type-name">Name</Label>
        <Input id="edit-type-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function TypeActions({ equipmentType }: { equipmentType: EquipmentType }) {
  const dialog = useRowDialog<'rename' | 'delete'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={`type ${equipmentType.name}`}
        actions={[
          { label: 'Rename', icon: Pencil, onSelect: () => dialog.show('rename') },
          { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => dialog.show('delete') },
        ]}
      />
      {dialog.mounted === 'rename' && <RenameEquipmentTypeDialog key={dialog.session} equipmentType={equipmentType} {...dialog.bind('rename')} />}
      <DeleteEquipmentTypeDialog equipmentType={equipmentType} {...dialog.bind('delete')} />
    </>
  )
}

function itemCount(n: number) {
  return n === 0 ? 'No items' : n === 1 ? '1 item' : `${n} items`
}

function TypeLink({ type, onShowItems }: { type: EquipmentType; onShowItems: (typeId: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onShowItems(type.id)}
      className="rounded-sm text-left font-medium text-foreground underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {type.name}
      <span className="sr-only">, show its items</span>
    </button>
  )
}

// Types are just names. Each links to the Items list filtered to that type.
export function EquipmentTypesTab({ onShowItems }: { onShowItems: (typeId: number) => void }) {
  const { data: types, isLoading, isError } = useEquipmentTypes()
  const { data: equipment } = useEquipment('All')
  const counts = new Map<number, number>()
  for (const item of equipment ?? []) counts.set(item.equipmentTypeId, (counts.get(item.equipmentTypeId) ?? 0) + 1)

  return (
    <AdminSection
      title="Types"
      description="Kinds of equipment, such as Centrifuge or Microscope. Choose a type to see its items."
      action={<CreateEquipmentTypeDialog />}
    >
      <ResponsiveList
        items={types}
        isLoading={isLoading}
        isError={isError}
        noun="types"
        getKey={(t) => t.id}
        search={{ label: 'Search types', placeholder: 'Search types', text: (t) => t.name }}
        empty={{ title: 'No types yet.', description: 'Add the first type, such as Centrifuge.' }}
        columns={[
          { key: 'name', header: 'Type', cell: (t) => <TypeLink type={t} onShowItems={onShowItems} /> },
          {
            key: 'count',
            header: 'Items',
            className: 'w-32',
            cell: (t) => <span className="text-muted-foreground tabular-nums">{itemCount(counts.get(t.id) ?? 0)}</span>,
          },
        ]}
        renderCard={(t) => (
          <>
            <TypeLink type={t} onShowItems={onShowItems} />
            <p className="text-[13px] text-muted-foreground">{itemCount(counts.get(t.id) ?? 0)}</p>
          </>
        )}
        renderActions={(t) => <TypeActions equipmentType={t} />}
      />
    </AdminSection>
  )
}
