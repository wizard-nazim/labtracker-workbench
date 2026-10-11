import { createElement } from 'react'
import { cn } from 'cn'
import { getEquipmentIcon } from './equipment-icons'

interface EquipmentAvatarProps {
  imageUrl: string | null
  iconKey: string | null
  name: string
  className?: string
  // "brand" tints the fallback tile and scales the icon with the tile, for
  // the larger thumbnails on the browsing pages. Default keeps the quiet
  // grey tile used in dense lists.
  tone?: 'default' | 'brand'
}

// Image if uploaded, else the curated fallback icon, else a generic default —
// used anywhere an equipment item needs a visual (list rows, form preview).
export function EquipmentAvatar({ imageUrl, iconKey, name, className = 'size-9', tone = 'default' }: EquipmentAvatarProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={cn(className, 'rounded-md border border-border object-cover')} />
  }

  return (
    <div
      className={cn(
        className,
        'flex items-center justify-center rounded-md',
        tone === 'brand' ? 'bg-accent' : 'border border-border bg-muted/40',
      )}
    >
      {createElement(getEquipmentIcon(iconKey), {
        className: tone === 'brand' ? 'size-[45%] text-accent-foreground/70' : 'size-4 text-muted-foreground',
        strokeWidth: tone === 'brand' ? 1.5 : undefined,
        'aria-hidden': true,
      })}
    </div>
  )
}
