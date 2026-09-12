import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

interface CompanyContact {
  id: number
  companyId: number
  fullName: string
  email: string
  phone: string | null
}

interface Company {
  id: number
  name: string
  contacts: CompanyContact[]
}

function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => apiClient.get<Company[]>('/companies') })
}

function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { name: string }) => apiClient.post<Company>('/companies', request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })
}

function useUpdateCompany(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { name: string }) => apiClient.put<Company>(`/companies/${id}`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })
}

function useAddCompanyContact(companyId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { fullName: string; email: string; phone?: string }) =>
      apiClient.post<Company>(`/companies/${companyId}/contacts`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })
}

function useRemoveCompanyContact(companyId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactId: number) => apiClient.delete(`/companies/${companyId}/contacts/${contactId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })
}

function CreateCompanyDialog() {
  const [name, setName] = useState('')
  const create = useCreateCompany()

  async function handleSubmit() {
    await create.mutateAsync({ name })
    toast.success(`Added company "${name}".`)
    setName('')
  }

  return (
    <EntityDialog
      trigger={<Button size="sm">Add company</Button>}
      title="Add company"
      submitLabel="Add company"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company-name">Name</Label>
        <Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function EditCompanyDialog({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(company.name)
  const update = useUpdateCompany(company.id)

  async function handleSubmit() {
    await update.mutateAsync({ name })
    toast.success(`Updated company "${name}".`)
  }

  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost">
          Rename
        </Button>
      }
      title="Rename company"
      submitLabel="Save changes"
      onSubmit={handleSubmit}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-company-name">Name</Label>
        <Input id="edit-company-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </EntityDialog>
  )
}

function ManageContactsDialog({ company }: { company: Company }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const addContact = useAddCompanyContact(company.id)
  const removeContact = useRemoveCompanyContact(company.id)

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
          Contacts ({company.contacts.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company.name} — contacts</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {company.contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts yet.</p>}
          {company.contacts.map((contact) => (
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={addContact.isPending}>
            {addContact.isPending ? 'Adding…' : 'Add contact'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CompaniesTab() {
  const { data: companies, isLoading, isError } = useCompanies()

  return (
    <AdminSection
      title="Companies"
      description="External organizations that use shared equipment."
      action={<CreateCompanyDialog />}
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
              title="Couldn't load companies."
              description="Check that the API is running and try again."
            />
          )}

          {!isLoading && !isError && companies?.length === 0 && (
            <TableEmptyState colSpan={2} title="No companies yet." />
          )}

          {companies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium text-foreground">{company.name}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ManageContactsDialog company={company} />
                  <EditCompanyDialog company={company} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminSection>
  )
}
