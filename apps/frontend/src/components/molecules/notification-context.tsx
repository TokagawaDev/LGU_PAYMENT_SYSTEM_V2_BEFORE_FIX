'use client';

import * as React from 'react';
import { useAddOnSubmissions } from '@/hooks/use-add-on-submissions';
import { useAddOnServices } from '@/hooks/use-add-on-services';
import type { NotificationContextValue, NotificationItem } from '@/lib/notifications/types';
import {
  NotificationManager,
  createApplicationNotification,
  DEFAULT_POLL_CONFIG,
  type ApplicationSubmissionData,
} from '@/lib/notifications/notification-service';
import { formatNotificationTime } from '@/lib/notifications/utils';

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

/**
 * Hook to access notification context
 */
export function useNotificationContext(): NotificationContextValue {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    return {
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {
        // No-op fallback when context is not available
      },
      markAsReadAndDismiss: () => {
        // No-op fallback when context is not available
      },
      markAllAsRead: () => {
        // No-op fallback when context is not available
      },
      dismissAll: () => {
        // No-op fallback when context is not available
      },
      addNotification: () => {
        // No-op fallback when context is not available
      },
    };
  }
  return ctx;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  pollConfig?: Partial<typeof DEFAULT_POLL_CONFIG>;
}

/**
 * Notification provider that polls for updates and manages notification state.
 * Supports multiple notification types: application updates, payment updates, transaction updates, and system alerts.
 */
export function NotificationProvider({
  children,
  pollConfig = {},
}: NotificationProviderProps): React.JSX.Element {
  const { list } = useAddOnSubmissions();
  const { addOnServices } = useAddOnServices();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  
  const managerRef = React.useRef(
    new NotificationManager({
      ...DEFAULT_POLL_CONFIG,
      ...pollConfig,
    })
  );

  const manager = managerRef.current;

  // Sync manager state with React state
  React.useEffect(() => {
    setNotifications(manager.getNotifications());
  }, []);

  const updateNotifications = React.useCallback(() => {
    setNotifications(manager.getNotifications());
  }, [manager]);

  const addNotification = React.useCallback(
    (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'unread'>) => {
      const now = new Date().toISOString();
      // Generate ID based on notification type
      let id: string;
      if (notification.type === 'application_update') {
        id = `notif-app-${notification.submissionId}-${now}`;
      } else if (notification.type === 'payment_update' || notification.type === 'transaction_update') {
        id = `notif-tx-${notification.transactionId}-${now}`;
      } else {
        id = `notif-${notification.type}-${Date.now()}-${Math.random()}`;
      }

      const fullNotification: NotificationItem = {
        ...notification,
        id,
        createdAt: now,
        unread: true,
      } as NotificationItem;

      if (manager.addNotification(fullNotification)) {
        updateNotifications();
      }
    },
    [manager, updateNotifications]
  );

  const markAsRead = React.useCallback(
    (id: string) => {
      if (manager.markAsRead(id)) {
        updateNotifications();
      }
    },
    [manager, updateNotifications]
  );

  const markAsReadAndDismiss = React.useCallback(
    (id: string) => {
      if (manager.markAsReadAndDismiss(id)) {
        updateNotifications();
      }
    },
    [manager, updateNotifications]
  );

  const markAllAsRead = React.useCallback(() => {
    manager.markAllAsRead();
    updateNotifications();
  }, [manager, updateNotifications]);

  const dismissAll = React.useCallback(() => {
    manager.dismissAll();
    updateNotifications();
  }, [manager, updateNotifications]);

  // Poll for application updates
  const pollApplicationUpdates = React.useCallback(async () => {
    const result = await list({ page: 1, limit: 50 });
    const items = result.items ?? [];
    const isInitial = manager.isInitialRun();

    if (isInitial) {
      manager.completeInitialRun();
      // Track all existing items on initial run
      for (const item of items) {
        const id = item.id;
        const updatedAt = item.updatedAt ?? item.createdAt ?? '';
        if (updatedAt) {
          manager.trackLastSeen(id, updatedAt);
        }
      }
      return;
    }

    const newNotifications: NotificationItem[] = [];

    for (const item of items) {
      const id = item.id;
      const updatedAt = item.updatedAt ?? item.createdAt ?? '';
      if (!updatedAt) continue;

      const prev = manager.getLastSeen(id);
      manager.trackLastSeen(id, updatedAt);

      // Only notify if this is a new item or it was updated
      if (!prev || prev !== updatedAt) {
        const addOn = addOnServices.find((a) => a.id === item.addOnId || a.id === item.customApplicationServiceId);
        const addOnTitle = addOn?.title ?? item.addOnId ?? item.customApplicationServiceId ?? 'Application';

        const submissionData: ApplicationSubmissionData = {
          id,
          addOnId: item.addOnId || item.customApplicationServiceId || '',
          updatedAt,
          status: item.status,
          adminStatus: item.adminStatus,
        };

        const notification = createApplicationNotification(submissionData, addOnTitle);
        newNotifications.push(notification);
      }
    }

    if (newNotifications.length > 0) {
      manager.addNotifications(newNotifications);
      updateNotifications();
    }
  }, [list, addOnServices, manager, updateNotifications]);

  // Set up polling
  React.useEffect(() => {
    const config = { ...DEFAULT_POLL_CONFIG, ...pollConfig };
    let intervalId: ReturnType<typeof setInterval> | undefined;
    
    const timeoutId = setTimeout(() => {
      void pollApplicationUpdates();
      intervalId = setInterval(pollApplicationUpdates, config.pollIntervalMs);
    }, config.initialPollDelayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollApplicationUpdates, pollConfig]);

  const unreadCount = manager.getUnreadCount();
  const value = React.useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAsReadAndDismiss,
      markAllAsRead,
      dismissAll,
      addNotification,
    }),
    [notifications, unreadCount, markAsRead, markAsReadAndDismiss, markAllAsRead, dismissAll, addNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Re-export utilities for convenience
export { formatNotificationTime };
