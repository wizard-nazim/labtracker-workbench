import { Image as ImageIcon } from 'lucide-react'

interface PageBannerProps {
  src?: string
  alt?: string
}

export function PageBanner({ src, alt = '' }: PageBannerProps) {
  if (src) {
    return (
      <div className="overflow-hidden rounded-md border border-border shadow-lg ring-1 ring-foreground/10">
        <img src={src} alt={alt} className="h-40 w-full object-cover" />
      </div>
    )
  }

  return (
    <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <ImageIcon className="size-5" aria-hidden="true" />
        <span className="text-sm">Add a banner image</span>
      </div>
    </div>
  )
}
