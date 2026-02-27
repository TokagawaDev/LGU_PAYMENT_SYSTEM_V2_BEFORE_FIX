/**
 * Notification message templates
 */

import type { ApplicationAdminStatus } from './types';

export const APPLICATION_STATUS_MESSAGES: Record<ApplicationAdminStatus, string> = {
  pending: 'Your application has been received and is pending review.',
  reviewing: 'Your application is being reviewed.',
  rejected: 'Unfortunately, your application has been rejected.',
  approved: 'Congratulations! Your application has been approved.',
};

export const PAYMENT_STATUS_MESSAGES: Record<'paid' | 'failed' | 'refunded', string> = {
  paid: 'Your payment has been successfully processed.',
  failed: 'Your payment could not be processed. Please try again.',
  refunded: 'Your payment has been refunded.',
};

/**
 * Creates a notification message for application updates
 */
export function createApplicationMessage(
  applicationId: string,
  status?: 'draft' | 'submitted',
  adminStatus?: ApplicationAdminStatus
): string {
  const idDisplay = applicationId.slice(0, 8);
  let baseMessage: string;
  
  if (status === 'submitted' && adminStatus) {
    baseMessage = APPLICATION_STATUS_MESSAGES[adminStatus];
  } else if (status === 'submitted') {
    baseMessage = 'Your application has been submitted.';
  } else {
    baseMessage = 'Your application was updated.';
  }
  
  return `${baseMessage} (ID: ${idDisplay}...)`;
}

/**
 * Creates a notification message for payment updates
 */
export function createPaymentMessage(
  transactionId: string,
  reference: string,
  status: 'paid' | 'failed' | 'refunded',
  amount?: number
): string {
  const baseMessage = PAYMENT_STATUS_MESSAGES[status];
  const idDisplay = transactionId.slice(0, 8);
  let message = `${baseMessage} (ID: ${idDisplay}...)`;
  
  if (status === 'paid' && amount !== undefined) {
    message += ` Amount: ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  }
  
  return message;
}
