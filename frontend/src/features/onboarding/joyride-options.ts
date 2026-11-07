import { EVENTS, STATUS, type EventData, type Options } from 'react-joyride'

// One look for every tour (app, admin and per-page).
export const JOYRIDE_OPTIONS: Partial<Options> = {
  showProgress: true,
  skipBeacon: true,
  buttons: ['back', 'skip', 'primary'],
  primaryColor: 'var(--primary)',
  backgroundColor: 'var(--popover)',
  textColor: 'var(--popover-foreground)',
  arrowColor: 'var(--popover)',
  overlayColor: 'rgba(0, 0, 0, 0.5)',
}

export function tourEnded(data: EventData) {
  return data.type === EVENTS.TOUR_END && (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED)
}

export function tourFinished(data: EventData) {
  return data.type === EVENTS.TOUR_END && data.status === STATUS.FINISHED
}
