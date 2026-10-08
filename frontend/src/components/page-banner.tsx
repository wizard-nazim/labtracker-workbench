import { Image as ImageIcon } from 'lucide-react'

interface PageBannerProps {
  src?: string
  alt?: string
}

export function PageBanner({ src, alt = '' }: PageBannerProps) {
  if (src) {
    return (
      <div className="overflow-hidden rounded-md border border-border shadow-lg ring-1 ring-foreground/10">
        {/* Banners are 4:1 with the title lettered on the left: show the whole
            image on phones, and crop from the right (never the title) above that. */}
        <img src={src} alt={alt} className="aspect-[4/1] w-full object-cover object-left sm:aspect-auto sm:h-40" />
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
