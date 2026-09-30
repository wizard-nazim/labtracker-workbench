import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useUpdateMe, type Me } from './use-me'

// The only part of My account a person edits themselves: how staff can reach
// them, and whether they hear about equipment going out of service.
export function ContactSettingsCard({ me }: { me: Me }) {
  const [phone, setPhone] = useState(me.phone ?? '')
  const [notify, setNotify] = useState(me.notifyOnEquipmentChanges)
  const updateMe = useUpdateMe()

  const isDirty = phone.trim() !== (me.phone ?? '') || notify !== me.notifyOnEquipmentChanges

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const saved = await updateMe.mutateAsync({ phone: phone.trim() || null, notifyOnEquipmentChanges: notify })
      setPhone(saved.phone ?? '')
      toast.success('Contact and notification settings saved.')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">Contact and notifications</h2>
      </div>

      <div className="mt-4 flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-phone">Phone (optional)</Label>
          <Input
            id="account-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="e.g. 021 650 1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Science Officers can see this to contact you about a booking.</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-border accent-primary"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          <span>
            Notify me when equipment goes out of service, comes back, or its note changes
            <span className="block text-xs text-muted-foreground">
              You'll always be notified about your own bookings.
            </span>
          </span>
        </label>

        <div>
          <Button type="submit" size="sm" disabled={!isDirty || updateMe.isPending}>
            {updateMe.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>
    </form>
  )
}
