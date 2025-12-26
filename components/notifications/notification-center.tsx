'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertCircle,
  Clock,
  UserPlus,
  Share2,
  MessageSquare,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/lib/hooks/use-notifications'
import type { Tables } from '@/types/database'
import { cn } from '@/lib/utils'

type Notification = Tables<'notifications'>

interface NotificationCenterProps {
  onClose?: () => void
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'action_assigned':
      return <UserPlus className="h-4 w-4 text-blue-500" />
    case 'action_due':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'action_overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'analysis_shared':
      return <Share2 className="h-4 w-4 text-green-500" />
    case 'mention':
      return <MessageSquare className="h-4 w-4 text-purple-500" />
    case 'collaboration':
      return <Users className="h-4 w-4 text-cyan-500" />
    default:
      return <Bell className="h-4 w-4 text-gray-500" />
  }
}

function getNotificationLink(notification: Notification): string | null {
  if (notification.analysis_id) {
    return `/analyses/${notification.analysis_id}`
  }
  return null
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onClose,
}: {
  notification: Notification
  onMarkRead: () => void
  onDelete: () => void
  onClose?: () => void
}) {
  const link = getNotificationLink(notification)
  const isUnread = !notification.read_at

  const content = (
    <div
      className={cn(
        'flex gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
        isUnread && 'bg-muted/30'
      )}
      onClick={() => {
        if (isUnread) onMarkRead()
        if (link) onClose?.()
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isUnread && 'font-medium')}>
          {notification.title}
        </p>
        {notification.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-start gap-1">
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )

  if (link) {
    return (
      <Link href={link} className="block group">
        {content}
      </Link>
    )
  }

  return <div className="group">{content}</div>
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { data, isLoading } = useNotifications(10)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotification = useDeleteNotification()

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification List */}
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll see notifications here when you receive them
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markRead.mutate(notification.id)}
                onDelete={() => deleteNotification.mutate(notification.id)}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t px-4 py-2">
          <Link
            href="/notifications"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
