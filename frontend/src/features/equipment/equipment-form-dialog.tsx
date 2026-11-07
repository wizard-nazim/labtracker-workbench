import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { EntityDialog } from '@/components/entity-dialog'
import { Button } from '@/components/ui/button'
import { FieldValidationError, type FieldErrors } from '@/lib/api-error-message'
import { EquipmentFormFields } from './equipment-form-fields'
import {
  applyFormDefaults,
  buildEquipmentFormState,
  hasVisibleFieldError,
  toEquipmentRequest,
  useEquipmentFormState,
  validateEquipmentForm,
  type EquipmentFormState,
} from './equipment-form-state'
import { useCreateEquipment, useUpdateEquipment } from './use-equipment'
import { ScienceOfficersField, StatusField } from './equipment-status-fields'
import { useDepartments } from '@/features/admin/departments'
import { PrerequisiteHint, SETUP_LINKS } from '@/features/admin/prerequisite-hint'
import { useAuth } from '@/context/auth-context'
import type { Equipment } from './types'

const DIALOG_CLASS = 'sm:max-w-xl'

function checkForm(state: EquipmentFormState) {
  const errors = validateEquipmentForm(state)
  if (Object.keys(errors).length > 0) throw new FieldValidationError(errors)
}

export function CreateEquipmentDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useEquipmentFormState()
  const [errors, setErrors] = useState<FieldErrors>({})
  const create = useCreateEquipment()
  const { data: departments } = useDepartments()

  // Closing (saved or cancelled) starts the next "Add equipment" fresh.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setState(buildEquipmentFormState())
      setErrors({})
    }
  }

  async function handleSubmit() {
    const filled = applyFormDefaults(state, departments)
    if (filled !== state) setState(filled)
    checkForm(filled)
    const created = await create.mutateAsync(toEquipmentRequest(filled))
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
      <PrerequisiteHint
        before="equipment is owned by a department. Rooms and types can be added from this form."
        items={[{ missing: departments?.length === 0, what: 'a department', to: SETUP_LINKS.departments }]}
      />
      <EquipmentFormFields state={state} setState={setState} errors={errors} setErrors={setErrors} />
    </EntityDialog>
  )
}

// Either self-contained (renders its own Edit button, or `trigger`), or
// controlled with open/onOpenChange and mounted only while open, e.g. from a
// row's ⋯ menu.
export function EditEquipmentDialog({
  equipment,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  equipment: Equipment
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
  const [state, setState] = useEquipmentFormState(equipment)
  const [errors, setErrors] = useState<FieldErrors>({})
  const update = useUpdateEquipment(equipment.id)
  const { data: departments } = useDepartments()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SuperAdmin'

  // This dialog stays mounted (just hidden) between opens, so re-sync from the
  // latest equipment data every time it's opened rather than only on first
  // mount — otherwise it could show an image that was since changed elsewhere.
  function handleOpenChange(next: boolean) {
    if (next) setState(buildEquipmentFormState(equipment))
    setErrors({})
    setOpen(next)
  }

  async function handleSubmit() {
    const filled = applyFormDefaults(state, departments)
    if (filled !== state) setState(filled)
    checkForm(filled)
    await update.mutateAsync(toEquipmentRequest(filled))
    toast.success(`Updated equipment "${state.name.trim()}".`)
  }

  return (
    <EntityDialog
      trigger={
        isControlled
          ? undefined
          : (trigger ?? (
              <Button size="sm" variant="ghost" aria-label={`Edit ${equipment.name}`}>
                Edit
              </Button>
            ))
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
        moreOptionsExtra={
          isSuperAdmin ? (
            <>
              <StatusField equipment={equipment} />
              <ScienceOfficersField equipment={equipment} />
            </>
          ) : undefined
        }
      />
    </EntityDialog>
  )
}
