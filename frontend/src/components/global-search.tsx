import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/context/auth-context'
import { NAV_GROUPS } from '@/lib/nav-items'
import { useEquipment } from '@/features/equipment/use-equipment'
import { EquipmentAvatar } from '@/features/equipment/equipment-avatar'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: equipment } = useEquipment('All')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  const pages = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) => group.items).filter(
        (item) => !item.roles || (user && item.roles.includes(user.role)),
      ),
    [user],
  )

  const normalizedQuery = query.trim().toLowerCase()

  const matchedPages = normalizedQuery
    ? pages.filter((page) => page.label.toLowerCase().includes(normalizedQuery))
    : pages

  const matchedEquipment = normalizedQuery
    ? (equipment ?? []).filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.equipmentTypeName.toLowerCase().includes(normalizedQuery) ||
          item.roomLabel.toLowerCase().includes(normalizedQuery),
      )
    : []

  function goTo(path: string) {
    navigate(path)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        data-tour="global-search"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent sm:w-auto sm:min-w-48 sm:justify-start sm:gap-2 sm:rounded-md sm:border sm:border-border sm:px-3 sm:hover:bg-transparent sm:hover:border-primary/40"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden text-sm text-muted-foreground sm:inline">Search equipment, pages…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              placeholder="Search equipment, pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <ScrollArea className="max-h-96">
            <div className="p-2">
              {matchedPages.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Pages</p>
                  {matchedPages.map((page) => (
                    <button
                      key={page.to}
                      type="button"
                      onClick={() => goTo(page.to)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <page.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      {page.label}
                    </button>
                  ))}
                </div>
              )}

              {matchedEquipment.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Equipment</p>
                  {matchedEquipment.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(`/equipment/${item.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <EquipmentAvatar imageUrl={item.imageUrl} iconKey={item.iconKey} name={item.name} className="size-7" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.equipmentTypeName} · {item.roomLabel}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {normalizedQuery && matchedPages.length === 0 && matchedEquipment.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results for "{query}".</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
