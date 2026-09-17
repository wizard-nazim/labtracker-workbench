import { createElement } from 'react'
import { getEquipmentIcon } from './equipment-icons'

interface EquipmentAvatarProps {
  imageUrl: string | null
  iconKey: string | null
  name: string
  className?: string
}

// Image if uploaded, else the curated fallback icon, else a generic default —
// used anywhere an equipment item needs a visual (list rows, form preview).
export function EquipmentAvatar({ imageUrl, iconKey, name, className = 'size-9' }: EquipmentAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} rounded-md border border-border object-cover`}
      />
    )
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-md border border-border bg-muted/40`}>
      {createElement(getEquipmentIcon(iconKey), { className: 'size-4 text-muted-foreground', 'aria-hidden': true })}
    </div>
  )
}
