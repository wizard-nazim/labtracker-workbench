import { useRef, useState } from 'react'

// Which of a row's dialogs is open, for dialogs opened from its ⋯ menu.
// Render a dialog while `mounted === kind`, keyed by `session`: each opening
// remounts it with the row's latest data, and it stays mounted while it
// closes so it can animate out. Pass `triggerRef` to the RowActionsMenu so
// focus goes back to its ⋯ button when a dialog closes (Radix would aim for
// the menu item that opened it, which no longer exists).
export function useRowDialog<K extends string>() {
  const [open, setOpen] = useState<K | null>(null)
  const [mounted, setMounted] = useState<K | null>(null)
  const [session, setSession] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function restoreFocus() {
    const refocus = () => {
      const trigger = triggerRef.current
      const active = document.activeElement
      if (trigger?.isConnected && (!active || active === document.body || !active.isConnected)) trigger.focus()
    }
    // Once now, and once more after the close animation unmounts the dialog.
    requestAnimationFrame(refocus)
    setTimeout(refocus, 250)
  }

  return {
    open,
    mounted,
    session,
    triggerRef,
    show: (kind: K) => {
      setOpen(kind)
      setMounted(kind)
      setSession((n) => n + 1)
    },
    bind: (kind: K) => ({
      open: open === kind,
      onOpenChange: (next: boolean) => {
        setOpen(next ? kind : null)
        if (!next) restoreFocus()
      },
    }),
  }
}
