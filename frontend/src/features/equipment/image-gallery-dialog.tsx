import { useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useDeleteEquipmentImage, useEquipmentImages, useUploadEquipmentImage } from './use-equipment-images'

export function ImageGalleryDialog({ trigger, onSelect }: { trigger: React.ReactNode; onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const { data: images, isLoading } = useEquipmentImages()
  const upload = useUploadEquipmentImage()
  const remove = useDeleteEquipmentImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const uploaded = await upload.mutateAsync(file)
      onSelect(uploaded.url)
      setOpen(false)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync(id)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose an image</DialogTitle>
          <DialogDescription>Pick a photo already uploaded, or upload a new one from your device.</DialogDescription>
        </DialogHeader>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" aria-hidden="true" />
          {upload.isPending ? 'Uploading…' : 'Upload from device'}
        </Button>

        <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
          {isLoading && <p className="col-span-full text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && images?.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">No images uploaded yet — upload one above.</p>
          )}
          {images?.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => {
                  onSelect(image.url)
                  setOpen(false)
                }}
                className="block size-full"
              >
                <img src={image.url} alt="" className="aspect-square size-full object-cover" />
              </button>
              <button
                type="button"
                title="Delete from gallery"
                aria-label="Delete from gallery"
                disabled={remove.isPending}
                onClick={() => handleDelete(image.id)}
                className="absolute top-1 right-1 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity outline-none group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
