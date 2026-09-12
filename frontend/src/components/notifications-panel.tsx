import { useState } from 'react'
import { Bell, CalendarClock, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string
  icon: typeof Bell
  tone: 'default' | 'warning'
  title: string
  description: string
  time: string
  read: boolean
}

const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    icon: CalendarClock,
    tone: 'default',
    title: 'Booking approved',
    description: 'Your booking for the Beckman Coulter Centrifuge was approved.',
    time: '12 min ago',
    read: false,
  },
  {
    id: '2',
    icon: AlertTriangle,
    tone: 'warning',
    title: 'Equipment marked faulty',
    description: 'Autoclave A-3 was flagged faulty by a Science Officer.',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '3',
    icon: ClipboardCheck,
    tone: 'default',
    title: 'Usage recorded',
    description: 'Walk-in usage was logged for the Laminar Air Flow cabinet.',
    time: 'Yesterday',
    read: true,
  },
]

function NotificationRow({ notification }: { notification: Notification }) {
  const Icon = notification.icon
  return (
    <div className={`flex gap-3 border-b border-border px-4 py-3 last:border-0 ${notification.read ? '' : 'bg-accent/40'}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          notification.tone === 'warning' ? 'bg-status-faulty/10 text-status-faulty' : 'bg-primary/10 text-primary'
        }`}
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
      </div>
      {!notification.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
    </div>
  )
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <Popover>
      <PopoverTrigger className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Bell className="size-4.5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-primary" aria-hidden="true" />
        )}
        <span className="sr-only">Notifications</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
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
              onClick={markAllAsRead}
              className="text-xs font-medium text-primary hover:underline"
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
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-80">
              {notifications.filter((n) => !n.read).length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No unread notifications.</p>
              ) : (
                notifications.filter((n) => !n.read).map((n) => <NotificationRow key={n.id} notification={n} />)
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
