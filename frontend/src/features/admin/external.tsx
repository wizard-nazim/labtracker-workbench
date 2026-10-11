import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
import { EntityDialog } from '@/components/entity-dialog'
import { Pencil, Users } from 'lucide-react'
import { AddButton, AdminSection } from './admin-section'
import { ResponsiveList, RowActionsMenu } from '@/components/responsive-list'
import { useRowDialog } from '@/hooks/use-row-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExternalOrganization } from '@/features/external/types'
import { useExternalOrganizations } from '@/features/external/use-external'

function useCreateExternalOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { name: string }) => apiClient.post<ExternalOrganization>('/external', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external'] }),
  })
}

function useUpdateExternalOrganization(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { name: string }) => apiClient.put<ExternalOrganization>(`/external/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external'] }),
  })
}

function useAddExternalContact(externalOrganizationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { fullName: string; email: string; phone?: string }) =>
      apiClient.post<ExternalOrganization>(`/external/${externalOrganizationId}/contacts`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external'] }),
  })
}

function useRemoveExternalContact(externalOrganizationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactId: number) => apiClient.delete(`/external/${externalOrganizationId}/contacts/${contactId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external'] }),
  })
}

function CreateExternalOrganizationDialog() {
  const [name, setName] = useState('')
  const create = useCreateExternalOrganization()

  async function handleSubmit() {
    await create.mutateAsync({ name })
    toast.success(`Added "${name}".`)
    setName('')
  }

  return (
    <EntityDialog
      trigger={<AddButton>Add organization</AddButton>}
      title="Add external organization"
      submitLabel="Add"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="external-org-name">Name</Label>
        <Input id="external-org-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

interface ControlledDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditExternalOrganizationDialog({
  externalOrganization,
  open,
  onOpenChange,
}: { externalOrganization: ExternalOrganization } & ControlledDialogProps) {
  const [name, setName] = useState(externalOrganization.name)
  const update = useUpdateExternalOrganization(externalOrganization.id)

  async function handleSubmit() {
    await update.mutateAsync({ name })
    toast.success(`Updated "${name}".`)
  }

  return (
    <EntityDialog
      title="Rename organization"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-external-org-name">Name</Label>
        <Input id="edit-external-org-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function ManageContactsDialog({
  externalOrganization,
  open,
  onOpenChange,
}: { externalOrganization: ExternalOrganization } & ControlledDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const addContact = useAddExternalContact(externalOrganization.id)
  const removeContact = useRemoveExternalContact(externalOrganization.id)

  async function handleAddContact(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await addContact.mutateAsync({ fullName, email, phone: phone || undefined })
      toast.success(`Added contact "${fullName}".`)
      setFullName('')
      setEmail('')
      setPhone('')
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleRemove(contactId: number) {
    try {
      await removeContact.mutateAsync(contactId)
      toast.success('Contact removed.')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contacts at {externalOrganization.name}</DialogTitle>
          <DialogDescription>People here who can be booked in for shared equipment.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {externalOrganization.contacts.length === 0 && (
            <p className="text-sm text-muted-foreground">No contacts yet. Add the first one below.</p>
          )}
          {externalOrganization.contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0 wrap-anywhere">
                <p className="text-sm font-medium text-foreground">{contact.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {contact.email}
                  {contact.phone ? `, ${contact.phone}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                aria-label={`Remove ${contact.fullName}`}
                onClick={() => handleRemove(contact.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        <form className="flex flex-col gap-3 border-t border-border pt-4" onSubmit={handleAddContact}>
          <p className="text-sm font-medium text-foreground">Add a contact</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              aria-label="Full name"
              placeholder="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              type="email"
              aria-label="Email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Input
            type="tel"
            aria-label="Phone (optional)"
            placeholder="Phone (optional)"
            maxLength={30}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={addContact.isPending}>
            {addContact.isPending ? 'Adding…' : 'Add contact'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function contactCount(org: ExternalOrganization) {
  const n = org.contacts.length
  return n === 0 ? 'No contacts' : n === 1 ? '1 contact' : `${n} contacts`
}

function ExternalActions({ externalOrganization }: { externalOrganization: ExternalOrganization }) {
  const dialog = useRowDialog<'contacts' | 'rename'>()
  return (
    <>
      <RowActionsMenu triggerRef={dialog.triggerRef}
        itemName={externalOrganization.name}
        actions={[
          { label: 'Contacts', icon: Users, onSelect: () => dialog.show('contacts') },
          { label: 'Rename', icon: Pencil, onSelect: () => dialog.show('rename') },
        ]}
      />
      <ManageContactsDialog externalOrganization={externalOrganization} {...dialog.bind('contacts')} />
      {dialog.mounted === 'rename' && (
        <EditExternalOrganizationDialog key={dialog.session} externalOrganization={externalOrganization} {...dialog.bind('rename')} />
      )}
    </>
  )
}

export function ExternalTab() {
  const { data: organizations, isLoading, isError } = useExternalOrganizations()

  return (
    <AdminSection
      title="External contacts"
      description="Other universities or companies whose people use shared equipment."
      action={<CreateExternalOrganizationDialog />}
    >
      <ResponsiveList
        items={organizations}
        isLoading={isLoading}
        isError={isError}
        noun="external organizations"
        getKey={(o) => o.id}
        search={{
          label: 'Search external organizations',
          placeholder: 'Search by organization or contact',
          text: (o) => [o.name, ...o.contacts.map((c) => `${c.fullName} ${c.email}`)].join(' '),
        }}
        empty={{ title: 'No external organizations yet.', description: 'Add the first organization, then its contacts.' }}
        columns={[
          { key: 'name', header: 'Organization', cell: (o) => <span className="font-medium text-foreground">{o.name}</span> },
          { key: 'contacts', header: 'Contacts', cell: (o) => <span className="text-muted-foreground">{contactCount(o)}</span> },
        ]}
        renderCard={(o) => (
          <>
            <p className="font-medium text-foreground wrap-anywhere">{o.name}</p>
            <p className="text-[13px] text-muted-foreground">{contactCount(o)}</p>
          </>
        )}
        renderActions={(o) => <ExternalActions externalOrganization={o} />}
      />
    </AdminSection>
  )
}
