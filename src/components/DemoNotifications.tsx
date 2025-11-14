import { useEffect } from 'react';
import { useNotificationHelpers } from '../hooks/useNotificationHelpers';
import { useAuth } from '../hooks/useAuth';

/**
 * Demo component to add sample notifications on mount
 * Remove this in production!
 */
export function DemoNotifications() {
  const notificationHelpers = useNotificationHelpers();
  const { user } = useAuth();

  useEffect(() => {
    // Only add demo notifications once when user logs in
    if (!user) return;

    const hasAddedDemo = sessionStorage.getItem('demo_notifications_added');
    if (hasAddedDemo) return;

    // Add demo notifications after a short delay
    const timer = setTimeout(() => {
      // Add some sample notifications
      notificationHelpers.notifyProductApproved('iPhone 15 Pro Max 256GB');
      
      setTimeout(() => {
        notificationHelpers.notifyOrderReceived('ORD-2025-001');
      }, 500);

      setTimeout(() => {
        notificationHelpers.notifyWalletTopUp(50000);
      }, 1000);

      sessionStorage.setItem('demo_notifications_added', 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, notificationHelpers]);

  return null;
}
