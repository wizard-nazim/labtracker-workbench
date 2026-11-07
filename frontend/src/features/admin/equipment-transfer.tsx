import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Download, FileUp } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type TableFormat = 'csv' | 'xlsx'
type ImportRowOutcome = 'Add' | 'Skip' | 'Error'

interface ImportRowResult {
  row: number
  name: string
  outcome: ImportRowOutcome
  message: string | null
}

interface EquipmentImportResult {
  committed: boolean
  added: number
  skipped: number
  errors: number
  fileError: string | null
  rows: ImportRowResult[]
}

const FORMAT_LABEL: Record<TableFormat, string> = { csv: 'CSV', xlsx: 'Excel (.xlsx)' }

async function download(path: string, fallbackName: string) {
  try {
    await apiClient.downloadFile(path, fallbackName)
  } catch (err) {
    toast.error(apiErrorMessage(err))
  }
}

export function ExportEquipmentMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-full sm:w-auto">
          <Download aria-hidden="true" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['csv', 'xlsx'] as const).map((format) => (
          <DropdownMenuItem
            key={format}
            onSelect={() => void download(`/equipment/export?format=${format}`, `labtracker-equipment.${format}`)}
          >
            {FORMAT_LABEL[format]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const OUTCOME_BADGE: Record<ImportRowOutcome, { label: string; variant: 'secondary' | 'outline' | 'destructive' }> = {
  Add: { label: 'Will add', variant: 'secondary' },
  Skip: { label: 'Skip', variant: 'outline' },
  Error: { label: 'Error', variant: 'destructive' },
}

// Upload, preview what would happen to each row (a dry run), then import.
// Nothing is added unless every row can be.
export function ImportEquipmentDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<EquipmentImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  function reset() {
    setFile(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function send(chosen: File, dryRun: boolean) {
    setBusy(true)
    setError(null)
    try {
      return await apiClient.uploadFile<EquipmentImportResult>(`/equipment/import?dryRun=${dryRun}`, chosen)
    } catch (err) {
      setError(apiErrorMessage(err))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    setFile(chosen)
    setPreview(null)
    if (chosen) setPreview(await send(chosen, true))
  }

  async function handleImport() {
    if (!file) return
    const result = await send(file, false)
    if (!result) return
    if (result.committed) {
      await queryClient.invalidateQueries({ queryKey: ['equipment'] })
      toast.success(
        `Imported ${result.added} ${result.added === 1 ? 'item' : 'items'}${result.skipped ? `, skipped ${result.skipped}` : ''}.`,
      )
      handleOpenChange(false)
    } else {
      // Something changed since the preview; show the fresh one.
      setPreview(result)
    }
  }

  const canImport = preview !== null && !preview.fileError && preview.errors === 0 && preview.added > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 w-full sm:w-auto">
          <FileUp aria-hidden="true" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import equipment</DialogTitle>
          <DialogDescription>
            Add many items at once from a CSV or Excel file (up to 2,000 rows). Types, rooms, departments and labs are
            matched by name, so add those first. Items already in the same room are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-muted-foreground">
            Start from the template:{' '}
            {(['csv', 'xlsx'] as const).map((format, i) => (
              <span key={format}>
                {i > 0 && ' or '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[13px]"
                  onClick={() => void download(`/equipment/import-template?format=${format}`, `labtracker-equipment-template.${format}`)}
                >
                  {FORMAT_LABEL[format]}
                </Button>
              </span>
            ))}
            . Name, Type and Room are required; Building and Floor help when room numbers repeat.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Choose a CSV or Excel file"
            onChange={handleFileChange}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
          />

          {busy && !preview && <p className="text-sm text-muted-foreground">Checking the file…</p>}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {preview?.fileError && (
            <p role="alert" className="text-sm text-destructive">
              {preview.fileError}
            </p>
          )}

          {preview && !preview.fileError && (
            <>
              <p className="text-sm text-foreground" aria-live="polite">
                {preview.added} to add, {preview.skipped} to skip, {preview.errors}{' '}
                {preview.errors === 1 ? 'error' : 'errors'}.
                {preview.errors > 0 && ' Fix the rows marked Error and choose the file again.'}
              </p>
              <div className="max-h-72 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...preview.rows]
                      .sort((a, b) => (a.outcome === 'Error' ? 0 : 1) - (b.outcome === 'Error' ? 0 : 1) || a.row - b.row)
                      .map((r) => (
                        <TableRow key={r.row}>
                          <TableCell className="tabular-nums text-muted-foreground">{r.row}</TableCell>
                          <TableCell className="wrap-anywhere whitespace-normal">{r.name || '—'}</TableCell>
                          <TableCell className="whitespace-normal">
                            <Badge variant={OUTCOME_BADGE[r.outcome].variant}>{OUTCOME_BADGE[r.outcome].label}</Badge>
                            {r.message && <p className="mt-1 text-xs text-muted-foreground">{r.message}</p>}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canImport || busy} onClick={() => void handleImport()}>
            {busy && preview ? 'Importing…' : preview && preview.added > 0 ? `Import ${preview.added}` : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
