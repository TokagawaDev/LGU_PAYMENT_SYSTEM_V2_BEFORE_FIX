/**
 * Notification types and interfaces
 */

export type NotificationType = 'application_update' | 'payment_update' | 'system_alert' | 'transaction_update';

export type ApplicationAdminStatus = 'pending' | 'reviewing' | 'rejected' | 'approved';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  unread: boolean;
}

export interface ApplicationUpdateNotification extends BaseNotification {
  type: 'application_update';
  submissionId: string;
  addOnId: string;
  addOnTitle: string;
  status?: 'draft' | 'submitted';
  adminStatus?: ApplicationAdminStatus;
}

export interface PaymentUpdateNotification extends BaseNotification {
  type: 'payment_update';
  transactionId: string;
  reference: string;
  status: 'paid' | 'failed' | 'refunded';
  amount?: number;
}

export interface TransactionUpdateNotification extends BaseNotification {
  type: 'transaction_update';
  transactionId: string;
  reference: string;
  status: string;
  message: string;
}

export interface SystemAlertNotification extends BaseNotification {
  type: 'system_alert';
  title: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export type NotificationItem =
  | ApplicationUpdateNotification
  | PaymentUpdateNotification
  | TransactionUpdateNotification
  | SystemAlertNotification;

export interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAsReadAndDismiss: (id: string) => void;
  markAllAsRead: () => void;
  dismissAll: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'unread'>) => void;
}

export interface NotificationPollConfig {
  pollIntervalMs: number;
  initialPollDelayMs: number;
  maxNotifications: number;
}
