/**
 * Notification system module
 * 
 * This module provides a comprehensive notification system that supports multiple notification types:
 * - Application updates (status changes, admin actions)
 * - Payment updates (paid, failed, refunded)
 * - Transaction updates (general transaction status changes)
 * - System alerts (info, warning, error, success)
 * 
 * Structure:
 * - types.ts: Type definitions and interfaces
 * - utils.ts: Utility functions (formatting, filtering, etc.)
 * - messages.ts: Message templates and creators
 * - notification-service.ts: Business logic and NotificationManager class
 * - notification-context.tsx: React context and provider (in components/molecules)
 */

export * from './types';
export * from './utils';
export * from './messages';
export * from './notification-service';
