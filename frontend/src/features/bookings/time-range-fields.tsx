import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TimeRange } from './time-range'

export function TimeRangeFields({
  idPrefix,
  value,
  onChange,
  startError,
  endError,
  fromLabel = 'From',
  toLabel = 'To',
}: {
  idPrefix: string
  value: TimeRange
  onChange: (next: TimeRange) => void
  startError?: string
  endError?: string
  fromLabel?: string
  toLabel?: string
}) {
  const [multiDay, setMultiDay] = useState(Boolean(value.endDate))
  const set = (patch: Partial<TimeRange>) => onChange({ ...value, ...patch })

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="sr-only">When</legend>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-date`}>{multiDay ? 'Starts on' : 'Day'}</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          required
          value={value.date}
          onChange={(e) => set({ date: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-from`}>{fromLabel}</Label>
          <Input
            id={`${idPrefix}-from`}
            type="time"
            required
            value={value.from}
            aria-invalid={startError ? true : undefined}
            aria-describedby={startError ? `${idPrefix}-from-error` : undefined}
            onChange={(e) => set({ from: e.target.value })}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-to`}>{toLabel}</Label>
          <Input
            id={`${idPrefix}-to`}
            type="time"
            required
            value={value.to}
            aria-invalid={endError ? true : undefined}
            aria-describedby={endError ? `${idPrefix}-to-error` : undefined}
            onChange={(e) => set({ to: e.target.value })}
          />
        </div>
      </div>
      {startError && (
        <p id={`${idPrefix}-from-error`} className="-mt-1 text-sm text-destructive">
          {startError}
        </p>
      )}
      {endError && (
        <p id={`${idPrefix}-to-error`} className="-mt-1 text-sm text-destructive">
          {endError}
        </p>
      )}
      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={multiDay}
          onChange={(e) => {
            setMultiDay(e.target.checked)
            set({ endDate: e.target.checked ? value.endDate || value.date : '' })
          }}
        />
        Ends on a later day
      </label>
      {multiDay && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-end-date`}>Ends on</Label>
          <Input
            id={`${idPrefix}-end-date`}
            type="date"
            required
            min={value.date}
            value={value.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </div>
      )}
    </fieldset>
  )
}
