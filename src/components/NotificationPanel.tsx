import React, { useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  XCircle, 
  X, 
  Check, 
  ExternalLink,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification, NotificationType } from '../contexts/NotificationContext';

const NOTIFICATION_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const NOTIFICATION_COLORS: Record<NotificationType, { bg: string; text: string; border: string }> = {
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
  },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Яг одоо';
  if (diffMins < 60) return `${diffMins} минутын өмнө`;
  if (diffHours < 24) return `${diffHours} цагийн өмнө`;
  if (diffDays < 7) return `${diffDays} өдрийн өмнө`;
  
  return date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

export default function NotificationPanel({ isOpen, onClose, anchorRef }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.hash = notification.actionUrl;
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--color-border-soft)] bg-white shadow-2xl dark:bg-slate-900"
      style={{ zIndex: 1000 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Мэдэгдэл</h3>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-main)]/60 transition hover:bg-[var(--color-border-soft)] hover:text-[var(--color-text-main)]"
              title="Бүгдийг уншсан"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-main)]/60 transition hover:bg-red-500/10 hover:text-red-600"
              title="Бүгдийг устгах"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-main)]/60 transition hover:bg-[var(--color-border-soft)] hover:text-[var(--color-text-main)]"
            title="Хаах"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[500px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-border-soft)]">
              <Info className="h-8 w-8 text-[var(--color-text-main)]/40" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-main)]">Мэдэгдэл байхгүй</p>
            <p className="mt-1 text-xs text-[var(--color-text-main)]/60">Шинэ мэдэгдэл ирэхэд энд харагдана</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-soft)]">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type];
              const colors = NOTIFICATION_COLORS[notification.type];

              return (
                <div
                  key={notification.id}
                  className={`group relative px-4 py-3 transition hover:bg-[var(--color-border-soft)]/30 ${
                    !notification.read ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colors.border} ${colors.bg}`}>
                      <Icon className={`h-4 w-4 ${colors.text}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[var(--color-text-main)]">{notification.title}</h4>
                        {!notification.read && (
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-main)]/70 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-[var(--color-text-main)]/50">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {notification.actionUrl && (
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {notification.actionLabel || 'Үзэх'} →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-main)]/60 transition hover:bg-green-500/10 hover:text-green-600"
                          title="Уншсан гэж тэмдэглэх"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-main)]/60 transition hover:bg-red-500/10 hover:text-red-600"
                        title="Устгах"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - only show if there are notifications */}
      {notifications.length > 0 && (
        <div className="border-t border-[var(--color-border-soft)] px-4 py-2">
          <button
            onClick={() => {
              // Navigate to notifications page if you have one
              window.location.hash = 'profile';
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-400"
          >
            Бүх мэдэгдэл үзэх
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
