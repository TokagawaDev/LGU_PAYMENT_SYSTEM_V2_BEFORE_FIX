/**
 * Route constants for the LGU Payment System
 * Defines public and private routes based on actual existing routes only
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Protected user routes
  DEFAULT: '/default',
  DASHBOARD: '/dashboard',
  APPLICATION: '/application',
  SETTINGS: '/settings',
  TRANSACTION_HISTORY: '/transaction-history',
  STATUS: '/status',
  SERVICES: '/services',

  // Protected admin routes
  ADMIN: {
    LOGIN: '/local/admin/login',
    DASHBOARD: '/local/admin/dashboard',
    SETTINGS: '/local/admin/settings',
    PAYMENT_FORM_BUILDER: '/local/admin/payment-form-builder',
    APPLICATION_FORM_BUILDER: '/local/admin/application-form-builder',
    SETTINGS_FORMS: '/local/admin/settings/forms',
    SETTINGS_CUSTOM_FORMS: '/local/admin/settings/custom-forms',
    CUSTOM_FORMS_NEW: '/local/admin/settings/custom-forms/new',
    CUSTOM_FORM_EDIT: (id: string) => `/local/admin/settings/custom-forms/${id}/edit`,
    CUSTOM_FORM_PREVIEW: (id: string) => `/local/admin/settings/custom-forms/${id}/preview`,
    USERS: '/local/admin/users',
    ADMINS: '/local/admin/admins',
    TRANSACTIONS: '/local/admin/transactions',
    REPORTS: '/local/admin/reports',
    APPLICATIONS: '/local/admin/applications',
  },
  
  // API routes
  API: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      VERIFY_EMAIL: '/api/auth/verify-email',
      RESEND_VERIFICATION: '/api/auth/resend-verification',
      VERIFY_TOKEN: '/api/auth/verify-token',
      ADMIN_LOGIN: '/api/auth/admin/login',
      CHECK_EMAIL: '/api/auth/check-email',
      LOGOUT: '/api/auth/logout',
      PROFILE: '/api/auth/profile',
      REFRESH: '/api/auth/refresh',
      CHANGE_PASSWORD: '/api/auth/password',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
    },
    PAYMENTS: {
      CHECKOUT: '/api/payments/checkout',
      WEBHOOK: '/api/payments/webhook',
      INITIATE: '/api/payments/initiate',
      CANCEL: '/api/payments/cancel',
    },
    USER: {
      TRANSACTIONS: '/api/user/transactions',
    },
    ADMIN: {
      USERS: '/api/admin/users',
      ADMINS: '/api/admin/admins',
      USER_STATS: '/api/admin/users/stats',
      TRANSACTIONS: '/api/admin/transactions',
      TRANSACTIONS_COUNT: '/api/admin/transactions/count',
      TRANSACTIONS_STATS: '/api/admin/transactions/stats',
      TRANSACTIONS_AGGREGATE: '/api/admin/transactions/reports/aggregate',
      TRANSACTIONS_EXPORT: '/api/admin/transactions/export',
      APPLICATIONS: '/api/admin/applications',
    }
  }
};

export const PUBLIC_ROUTES = [
  ROUTES.HOME, 
  ROUTES.REGISTER,
  ROUTES.VERIFY_EMAIL,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.ADMIN.LOGIN,
  ROUTES.API.AUTH.LOGIN,
  ROUTES.API.AUTH.REGISTER,
  ROUTES.API.AUTH.ADMIN_LOGIN,
  ROUTES.API.AUTH.LOGOUT,
  ROUTES.API.AUTH.VERIFY_EMAIL,
  ROUTES.API.AUTH.RESEND_VERIFICATION,
  ROUTES.API.AUTH.FORGOT_PASSWORD,
  ROUTES.API.AUTH.RESET_PASSWORD,
];

export const PRIVATE_USER_ROUTES = [
  ROUTES.DEFAULT,
  ROUTES.DASHBOARD,
  ROUTES.APPLICATION,
  ROUTES.SETTINGS,
  ROUTES.TRANSACTION_HISTORY,
  ROUTES.STATUS,
  ROUTES.SERVICES,
  ROUTES.API.AUTH.VERIFY_TOKEN,
];

/** Default landing page for authenticated users (citizen portal) */
export const DEFAULT_USER_PAGE = ROUTES.DASHBOARD;

export const PRIVATE_ADMIN_ROUTES = [
  ROUTES.ADMIN.DASHBOARD,
  ROUTES.ADMIN.SETTINGS,
  ROUTES.ADMIN.PAYMENT_FORM_BUILDER,
  ROUTES.ADMIN.APPLICATION_FORM_BUILDER,
  ROUTES.ADMIN.SETTINGS_CUSTOM_FORMS,
  ROUTES.ADMIN.USERS,
  ROUTES.ADMIN.ADMINS,
  ROUTES.ADMIN.TRANSACTIONS,
  ROUTES.ADMIN.REPORTS,
  ROUTES.ADMIN.APPLICATIONS,
];

export const API_ROUTES = ['/api/'];

/** Label for the citizen (user) portal used on home and in nav */
export const CITIZEN_PORTAL_LABEL = 'Citizen Portal';

export default ROUTES;