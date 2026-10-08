import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
      trigger={<Button size="sm">Add external org</Button>}
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

function EditExternalOrganizationDialog({ externalOrganization }: { externalOrganization: ExternalOrganization }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(externalOrganization.name)
  const update = useUpdateExternalOrganization(externalOrganization.id)

  async function handleSubmit() {
    await update.mutateAsync({ name })
    toast.success(`Updated "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Rename
        </Button>
      }
      title="Rename external organization"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-external-org-name">Name</Label>
        <Input id="edit-external-org-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function ManageContactsDialog({ externalOrganization }: { externalOrganization: ExternalOrganization }) {
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
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Contacts ({externalOrganization.contacts.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{externalOrganization.name} — contacts</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {externalOrganization.contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
          {externalOrganization.contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{contact.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {contact.email}
                  {contact.phone ? `, ${contact.phone}` : ''}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(contact.id)}>
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

export function ExternalTab() {
  const { data: organizations, isLoading, isError } = useExternalOrganizations()

  return (
    <AdminSection
      title="External"
      description="External individuals or departments (e.g. from another university) that use shared equipment."
      action={<CreateExternalOrganizationDialog />}
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
              title="Couldn't load external organizations."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && organizations?.length === 0 && (
            <TableEmptyState colSpan={2} title="No external organizations yet." />
          )}

          {organizations?.map((externalOrganization) => (
            <TableRow key={externalOrganization.id}>
              <TableCell className="font-medium text-foreground">{externalOrganization.name}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ManageContactsDialog externalOrganization={externalOrganization} />
                  <EditExternalOrganizationDialog externalOrganization={externalOrganization} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
