import { FieldValidationError } from '@/lib/api-error-message'

// A booking or usage window, entered the way people think about it: a day,
// then from/to times. Overnight runs tick "Ends on a later day" to get a
// second date field.
export interface TimeRange {
  date: string
  from: string
  to: string
  endDate: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toTimeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function emptyTimeRange(): TimeRange {
  return { date: toDateInput(new Date()), from: '', to: '', endDate: '' }
}

export function timeRangeFrom(start: string | Date, end: string | Date): TimeRange {
  const s = new Date(start)
  const e = new Date(end)
  const endDate = toDateInput(e)
  return { date: toDateInput(s), from: toTimeInput(s), to: toTimeInput(e), endDate: endDate === toDateInput(s) ? '' : endDate }
}

export function isTimeRangeComplete(range: TimeRange) {
  return Boolean(range.date && range.from && range.to)
}

// Returns ISO start/end, or throws a FieldValidationError keyed by the
// API's property names so EntityDialog highlights the right field.
export function resolveTimeRange(range: TimeRange, keys: { start: string; end: string }) {
  const start = new Date(`${range.date}T${range.from}`)
  const end = new Date(`${range.endDate || range.date}T${range.to}`)
  if (Number.isNaN(start.getTime())) throw new FieldValidationError({ [keys.start]: ['Choose a day and start time.'] })
  if (Number.isNaN(end.getTime())) throw new FieldValidationError({ [keys.end]: ['Choose an end time.'] })
  if (end <= start) {
    throw new FieldValidationError({
      [keys.end]: [range.endDate ? 'The end must be after the start.' : 'The end time must be after the start time.'],
    })
  }
  return { start: start.toISOString(), end: end.toISOString() }
}
