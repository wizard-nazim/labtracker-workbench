import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck, CalendarX, AlertTriangle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type AppNotification,
} from '@/features/notifications/use-notifications'

const ICONS = {
  EquipmentUpdated: AlertTriangle,
  BookingApproved: CalendarCheck,
  BookingRejected: CalendarX,
} as const

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function timeAgo(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 1) return 'Just now'
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, 'hour')
  return relativeFormat.format(Math.round(hours / 24), 'day')
}

function NotificationRow({ notification, onOpen }: { notification: AppNotification; onOpen: (n: AppNotification) => void }) {
  const Icon = ICONS[notification.type]
  const isRead = notification.readAt !== null
  const isWarning = notification.type !== 'BookingApproved'
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none ${isRead ? '' : 'bg-accent/40'}`}
    >
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isWarning ? 'bg-status-faulty/10 text-status-faulty' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground wrap-anywhere">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
      </div>
      {!isRead && (
        <>
          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="sr-only">Unread</span>
        </>
      )}
    </button>
  )
}

function NotificationList({
  items,
  isLoading,
  isError,
  emptyText,
  onOpen,
}: {
  items: AppNotification[]
  isLoading: boolean
  isError: boolean
  emptyText: string
  onOpen: (n: AppNotification) => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">Couldn't load notifications. They'll retry in a minute.</p>
  }
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
  }
  return items.map((n) => <NotificationRow key={n.id} notification={n} onOpen={onOpen} />)
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data ?? []
  const unread = notifications.filter((n) => n.readAt === null)
  const unreadCount = unread.length

  function openNotification(n: AppNotification) {
    if (n.readAt === null) markRead.mutate(n.id)
    setOpen(false)
    if (n.bookingId !== null) navigate('/bookings')
    else if (n.equipmentId !== null) navigate(`/equipment/${n.equipmentId}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-tour="notifications"
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4.5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">{unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList variant="line" className="w-full justify-start border-b border-border px-4">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-1">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              <Badge variant="secondary" className="ml-1">
                {unreadCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-80">
              <NotificationList
                items={notifications}
                isLoading={isLoading}
                isError={isError}
                emptyText="No notifications yet. You'll hear here when a booking is decided or equipment goes out of service."
                onOpen={openNotification}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-80">
              <NotificationList
                items={unread}
                isLoading={isLoading}
                isError={isError}
                emptyText="No unread notifications."
                onOpen={openNotification}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
