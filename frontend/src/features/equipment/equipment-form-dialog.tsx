import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { EquipmentFormFields } from './equipment-form-fields'
import { buildEquipmentFormState, toEquipmentRequest, useEquipmentFormState } from './equipment-form-state'
import { useCreateEquipment, useUpdateEquipment } from './use-equipment'
import type { Equipment } from './types'

export function CreateEquipmentDialog() {
  const [state, setState] = useEquipmentFormState()
  const create = useCreateEquipment()

  async function handleSubmit() {
    const created = await create.mutateAsync(toEquipmentRequest(state))
    toast.success(`Added equipment "${created.name}".`)
    setState({
      name: '',
      serialNumber: '',
      description: '',
      equipmentTypeId: '',
      roomId: '',
      owningDepartmentId: '',
      isShared: false,
      iconKey: null,
      imageUrl: null,
    })
  }

  const canSubmit = Boolean(state.name && state.equipmentTypeId && state.roomId && state.owningDepartmentId)

  return (
    <EntityDialog
      trigger={<Button size="sm">Add equipment</Button>}
      title="Add equipment"
      submitLabel="Add equipment"
      submitDisabled={!canSubmit}
      onSubmit={handleSubmit}
    >
      <EquipmentFormFields state={state} setState={setState} />
    </EntityDialog>
  )
}

export function EditEquipmentDialog({ equipment }: { equipment: Equipment }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useEquipmentFormState(equipment)
  const update = useUpdateEquipment(equipment.id)

  // This dialog stays mounted (just hidden) between opens, so its form state
  // would otherwise go stale after the first open — e.g. showing an old image
  // that was since changed elsewhere. Re-sync from the latest equipment data
  // every time it's opened, rather than only on first mount.
  useEffect(() => {
    if (open) setState(buildEquipmentFormState(equipment))
  }, [open, equipment, setState])

  async function handleSubmit() {
    await update.mutateAsync(toEquipmentRequest(state))
    toast.success(`Updated equipment "${state.name}".`)
  }

  const canSubmit = Boolean(state.name && state.equipmentTypeId && state.roomId && state.owningDepartmentId)

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit
        </Button>
      }
      title="Edit equipment"
      submitLabel="Save changes"
      submitDisabled={!canSubmit}
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <EquipmentFormFields state={state} setState={setState} />
    </EntityDialog>
  )
}
