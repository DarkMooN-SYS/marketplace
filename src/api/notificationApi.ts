import { secureLocalStorage } from '../utils/secureStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Helper function for API requests with 401 handling
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  // 🔒 SECURE: Use secureLocalStorage
  let token = secureLocalStorage.getItem('authToken');
  if (!token) {
    const oldToken = localStorage.getItem('authToken');
    if (oldToken) {
      secureLocalStorage.setItem('authToken', oldToken);
      localStorage.removeItem('authToken');
      token = oldToken;
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // If 401 Unauthorized, clear auth and notify
    if (response.status === 401) {
      console.warn('[NotificationAPI] 401 Unauthorized - Token expired or invalid');
      secureLocalStorage.removeItem('authToken');
      secureLocalStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      window.dispatchEvent(new CustomEvent('auth:required'));
    }
    
    throw new Error(`Failed to ${options?.method || 'GET'} ${url}`);
  }

  return response.json() as Promise<T>;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'payment' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export const notificationApi = {
  /**
   * Get user notifications
   */
  async getNotifications(): Promise<Notification[]> {
    return apiRequest<Notification[]>(`${API_BASE_URL}/notifications`, {
      method: 'GET',
    });
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return apiRequest<{ message: string; count: number }>(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PUT',
    });
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return apiRequest<{ count: number }>(`${API_BASE_URL}/notifications/unread-count`, {
      method: 'GET',
    });
  },
};
