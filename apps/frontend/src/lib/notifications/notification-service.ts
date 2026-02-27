/**
 * Notification service - handles notification business logic
 */

import type {
  NotificationItem,
  ApplicationUpdateNotification,
  PaymentUpdateNotification,
  TransactionUpdateNotification,
  SystemAlertNotification,
  NotificationPollConfig,
} from './types';
import {
  generateNotificationId,
  notificationExists,
  sortNotificationsByDate,
} from './utils';
import { createApplicationMessage, createPaymentMessage } from './messages';

export const DEFAULT_POLL_CONFIG: NotificationPollConfig = {
  pollIntervalMs: 60_000, // 1 minute
  initialPollDelayMs: 3_000, // 3 seconds
  maxNotifications: 100,
};

export interface ApplicationSubmissionData {
  id: string;
  addOnId: string;
  updatedAt?: string;
  status?: 'draft' | 'submitted';
  adminStatus?: 'pending' | 'reviewing' | 'rejected' | 'approved';
}

export interface PaymentData {
  transactionId: string;
  reference: string;
  status: 'paid' | 'failed' | 'refunded';
  amount?: number;
}

export interface TransactionData {
  transactionId: string;
  reference: string;
  status: string;
  message: string;
}

export interface SystemAlertData {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

/**
 * Creates an application update notification
 */
export function createApplicationNotification(
  submission: ApplicationSubmissionData,
  addOnTitle: string
): ApplicationUpdateNotification {
  const updatedAt = submission.updatedAt ?? new Date().toISOString();
  return {
    id: generateNotificationId('application_update', submission.id, updatedAt),
    type: 'application_update',
    submissionId: submission.id,
    addOnId: submission.addOnId,
    addOnTitle,
    message: createApplicationMessage(submission.id, submission.status, submission.adminStatus),
    createdAt: updatedAt,
    unread: true,
    status: submission.status,
    adminStatus: submission.adminStatus,
  };
}

/**
 * Creates a payment update notification
 */
export function createPaymentNotification(payment: PaymentData): PaymentUpdateNotification {
  const now = new Date().toISOString();
  return {
    id: generateNotificationId('payment_update', payment.transactionId, now),
    type: 'payment_update',
    transactionId: payment.transactionId,
    reference: payment.reference,
    status: payment.status,
    amount: payment.amount,
    message: createPaymentMessage(payment.transactionId, payment.reference, payment.status, payment.amount),
    createdAt: now,
    unread: true,
  };
}

/**
 * Creates a transaction update notification
 */
export function createTransactionNotification(
  transaction: TransactionData
): TransactionUpdateNotification {
  const now = new Date().toISOString();
  const idDisplay = transaction.transactionId.slice(0, 8);
  const messageWithId = transaction.message
    ? `${transaction.message} (ID: ${idDisplay}...)`
    : `Transaction updated. (ID: ${idDisplay}...)`;
  return {
    id: generateNotificationId('transaction_update', transaction.transactionId, now),
    type: 'transaction_update',
    transactionId: transaction.transactionId,
    reference: transaction.reference,
    status: transaction.status,
    message: messageWithId,
    createdAt: now,
    unread: true,
  };
}

/**
 * Creates a system alert notification
 */
export function createSystemAlertNotification(alert: SystemAlertData): SystemAlertNotification {
  const now = new Date().toISOString();
  return {
    id: generateNotificationId('system_alert', alert.title.toLowerCase().replace(/\s+/g, '-'), now),
    type: 'system_alert',
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    createdAt: now,
    unread: true,
  };
}

/**
 * Notification manager class to handle notification state and operations
 */
export class NotificationManager {
  private notifications: NotificationItem[] = [];
  private maxNotifications: number;
  private lastSeenRef: Record<string, string> = {};
  private initialRunRef = true;

  constructor(config: Partial<NotificationPollConfig> = {}) {
    this.maxNotifications = config.maxNotifications ?? DEFAULT_POLL_CONFIG.maxNotifications;
  }

  /**
   * Adds a notification if it doesn't already exist
   */
  addNotification(notification: NotificationItem): boolean {
    if (notificationExists(this.notifications, notification)) {
      return false;
    }

    this.notifications = sortNotificationsByDate([
      notification,
      ...this.notifications,
    ]).slice(0, this.maxNotifications);

    return true;
  }

  /**
   * Adds multiple notifications
   */
  addNotifications(notifications: NotificationItem[]): number {
    let added = 0;
    for (const notification of notifications) {
      if (this.addNotification(notification)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Marks a notification as read
   */
  markAsRead(id: string): boolean {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) return false;

    this.notifications[index] = { ...this.notifications[index], unread: false };
    return true;
  }

  /**
   * Marks a notification as read and removes it
   */
  markAsReadAndDismiss(id: string): boolean {
    const before = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    return this.notifications.length < before;
  }

  /**
   * Marks all notifications as read
   */
  markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, unread: false }));
  }

  /**
   * Removes all notifications
   */
  dismissAll(): void {
    this.notifications = [];
  }

  /**
   * Gets all notifications
   */
  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  /**
   * Gets unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => n.unread).length;
  }

  /**
   * Tracks last seen timestamp for an item (for polling)
   */
  trackLastSeen(id: string, timestamp: string): void {
    this.lastSeenRef[id] = timestamp;
  }

  /**
   * Gets last seen timestamp for an item
   */
  getLastSeen(id: string): string | undefined {
    return this.lastSeenRef[id];
  }

  /**
   * Checks if this is the initial run
   */
  isInitialRun(): boolean {
    return this.initialRunRef;
  }

  /**
   * Marks initial run as complete
   */
  completeInitialRun(): void {
    this.initialRunRef = false;
  }

  /**
   * Resets the manager state
   */
  reset(): void {
    this.notifications = [];
    this.lastSeenRef = {};
    this.initialRunRef = true;
  }
}
