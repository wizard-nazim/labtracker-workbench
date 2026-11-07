import { useState } from 'react'
import type { EventData, Step } from 'react-joyride'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ME_KEY } from '@/features/account/use-me'
import { tourEnded } from './joyride-options'

// Drives a tour without any effects: `run` is fully derived from two pieces
// of local state (never set from inside a useEffect, only from Joyride's own
// callback or a manual "restart" action) plus a server-tracked completion
// flag. `dismissedThisSession` stops the just-finished tour from immediately
// re-triggering while the completion mutation is still in flight (the server
// flag hasn't refetched as true yet).
export function useTour(steps: Step[], hasCompleted: boolean | undefined, completeEndpoint: string) {
  const [forceRun, setForceRun] = useState(false)
  const [dismissedThisSession, setDismissedThisSession] = useState(false)
  const queryClient = useQueryClient()

  const complete = useMutation({
    mutationFn: () => apiClient.post(completeEndpoint),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  })

  const run = forceRun || (!dismissedThisSession && hasCompleted === false)

  function handleEvent(data: EventData) {
    if (tourEnded(data)) {
      setForceRun(false)
      setDismissedThisSession(true)
      if (hasCompleted === false) {
        complete.mutate()
      }
    }
  }

  function restart() {
    setDismissedThisSession(false)
    setForceRun(true)
  }

  return { run, steps, handleEvent, restart }
}
