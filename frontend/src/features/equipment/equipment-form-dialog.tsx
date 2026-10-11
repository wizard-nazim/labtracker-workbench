import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { FieldValidationError, type FieldErrors } from '@/lib/api-error-message'
import { EquipmentFormFields } from './equipment-form-fields'
import {
  buildEquipmentFormState,
  hasVisibleFieldError,
  toEquipmentRequest,
  useEquipmentFormState,
  validateEquipmentForm,
  type EquipmentFormState,
} from './equipment-form-state'
import { useCreateEquipment, useUpdateEquipment } from './use-equipment'
import type { Equipment } from './types'

const DIALOG_CLASS = 'sm:max-w-2xl'

function checkForm(state: EquipmentFormState) {
  const errors = validateEquipmentForm(state)
  if (Object.keys(errors).length > 0) throw new FieldValidationError(errors)
}

export function CreateEquipmentDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useEquipmentFormState()
  const [errors, setErrors] = useState<FieldErrors>({})
  const create = useCreateEquipment()

  // Closing (saved or cancelled) starts the next "Add equipment" fresh.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setState(buildEquipmentFormState())
      setErrors({})
    }
  }

  async function handleSubmit() {
    checkForm(state)
    const created = await create.mutateAsync(toEquipmentRequest(state))
    toast.success(`Added equipment "${created.name}".`)
    setState(buildEquipmentFormState())
    setErrors({})
  }

  return (
    <EntityDialog
      trigger={trigger ?? <Button size="sm">Add equipment</Button>}
      title="Add equipment"
      submitLabel="Add equipment"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={handleOpenChange}
      contentClassName={DIALOG_CLASS}
      stickyFooter
      onFieldErrors={(fieldErrors) => {
        setErrors(fieldErrors)
        return hasVisibleFieldError(fieldErrors)
      }}
    >
      <EquipmentFormFields state={state} setState={setState} errors={errors} setErrors={setErrors} />
    </EntityDialog>
  )
}

export function EditEquipmentDialog({
  equipment,
  trigger,
}: {
  equipment: Equipment
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useEquipmentFormState(equipment)
  const [errors, setErrors] = useState<FieldErrors>({})
  const update = useUpdateEquipment(equipment.id)

  // This dialog stays mounted (just hidden) between opens, so re-sync from the
  // latest equipment data every time it's opened rather than only on first
  // mount — otherwise it could show an image that was since changed elsewhere.
  function handleOpenChange(next: boolean) {
    if (next) setState(buildEquipmentFormState(equipment))
    setErrors({})
    setOpen(next)
  }

  async function handleSubmit() {
    checkForm(state)
    await update.mutateAsync(toEquipmentRequest(state))
    toast.success(`Updated equipment "${state.name.trim()}".`)
  }

  return (
    <EntityDialog
      trigger={
        trigger ?? (
          <Button size="sm" variant="ghost" aria-label={`Edit ${equipment.name}`}>
            Edit
          </Button>
        )
      }
      title="Edit equipment"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={handleOpenChange}
      contentClassName={DIALOG_CLASS}
      stickyFooter
      onFieldErrors={(fieldErrors) => {
        setErrors(fieldErrors)
        return hasVisibleFieldError(fieldErrors)
      }}
    >
      <EquipmentFormFields
        state={state}
        setState={setState}
        errors={errors}
        setErrors={setErrors}
        currentOwner={equipment.owner}
      />
    </EntityDialog>
  )
}
