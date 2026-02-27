/**
 * Notification utility functions
 */

import type { NotificationItem } from './types';

/**
 * Formats a notification timestamp to a human-readable relative time string
 */
export function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3600_000);
    const diffDays = Math.floor(diffMs / 86400_000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

/**
 * Generates a unique notification ID
 */
export function generateNotificationId(type: string, identifier: string, timestamp?: string): string {
  const ts = timestamp || new Date().toISOString();
  return `notif-${type}-${identifier}-${ts}`;
}

/**
 * Sorts notifications by creation date (newest first)
 */
export function sortNotificationsByDate(notifications: NotificationItem[]): NotificationItem[] {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Filters notifications by type
 */
export function filterNotificationsByType<T extends NotificationItem>(
  notifications: NotificationItem[],
  type: T['type']
): T[] {
  return notifications.filter((n) => n.type === type) as T[];
}

/**
 * Gets unread count from notifications
 */
export function getUnreadCount(notifications: NotificationItem[]): number {
  return notifications.filter((n) => n.unread).length;
}

/**
 * Checks if a notification already exists (by submissionId, transactionId, etc.)
 */
export function notificationExists(
  notifications: NotificationItem[],
  newNotification: NotificationItem
): boolean {
  if (newNotification.type === 'application_update') {
    return notifications.some(
      (n) =>
        n.type === 'application_update' &&
        n.submissionId === newNotification.submissionId
    );
  }
  if (newNotification.type === 'payment_update' || newNotification.type === 'transaction_update') {
    return notifications.some(
      (n) =>
        (n.type === 'payment_update' || n.type === 'transaction_update') &&
        'transactionId' in n &&
        'transactionId' in newNotification &&
        n.transactionId === newNotification.transactionId
    );
  }
  // For system alerts, check by ID
  return notifications.some((n) => n.id === newNotification.id);
}
