import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/adminApi';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  syncWithBackend: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'app_notifications';
const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [notifications]);

  const syncWithBackend = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const backendNotifications = await api.notifications.getAll();
      setNotifications(backendNotifications);
    } catch (error) {
      console.error('Failed to sync notifications with backend:', error);
    }
  }, []);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS));
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await api.notifications.create({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel
        });
      }
    } catch (error) {
      console.error('Failed to create notification on backend:', error);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const token = localStorage.getItem('authToken');
      if (token) await api.notifications.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark as read on backend:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const token = localStorage.getItem('authToken');
      if (token) await api.notifications.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read on backend:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const token = localStorage.getItem('authToken');
      if (token) await api.notifications.delete(id);
    } catch (error) {
      console.error('Failed to delete notification on backend:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      const token = localStorage.getItem('authToken');
      if (token) await api.notifications.clearAll();
    } catch (error) {
      console.error('Failed to clear notifications on backend:', error);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    syncWithBackend
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
