// Every booking/usage time on screen reads the same way:
//   same day   → "Tue 14 Oct, 09:00–11:00"
//   two days   → "Tue 14 Oct, 22:00 – Wed 15 Oct, 02:00"
// Plain 24-hour times, no seconds, no year unless it isn't this year.

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

function dayLabel(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).formatToParts(date)
  // en-GB puts a comma after the weekday ("Tue, 14 Oct"); drop it.
  return parts
    .filter((p) => p.type !== 'literal')
    .map((p) => p.value)
    .join(' ')
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function formatDay(value: string | Date) {
  return dayLabel(new Date(value))
}

export function formatTime(value: string | Date) {
  return timeFormat.format(new Date(value))
}

export function formatWhen(startValue: string | Date, endValue: string | Date) {
  const start = new Date(startValue)
  const end = new Date(endValue)
  if (isSameDay(start, end)) return `${dayLabel(start)}, ${timeFormat.format(start)}–${timeFormat.format(end)}`
  return `${dayLabel(start)}, ${timeFormat.format(start)} – ${dayLabel(end)}, ${timeFormat.format(end)}`
}

// "2 h 30 min", "45 min".
export function formatDuration(startValue: string | Date, endValue: string | Date) {
  const minutes = Math.max(0, Math.round((new Date(endValue).getTime() - new Date(startValue).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
