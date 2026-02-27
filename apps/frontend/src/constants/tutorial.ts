/**
 * Guided tutorial for the Citizen Portal.
 * Uses data-tour attributes on DOM elements; ensure layout/sidebar/header have matching values.
 */
export const TUTORIAL_STORAGE_KEY = 'lgu_citizen_tutorial_done';

export const TOUR = {
  SIDEBAR: 'sidebar',
  MAIN: 'main-content',
  NOTIFICATIONS: 'notifications',
  NAV_SETTINGS: 'nav-settings',
} as const;

export type TourTarget = (typeof TOUR)[keyof typeof TOUR];

export interface TourStepConfig {
  element: string;
  title: string;
  description: string;
}

/** Steps for the custom in-app tour (no third-party lib). */
export const TOUR_STEPS: TourStepConfig[] = [
  {
    element: 'body',
    title: 'Welcome to the Citizen Portal',
    description:
      'This short tour highlights key features and navigation. Use Next to continue, or close to skip and revisit anytime from Settings.',
  },
  {
    element: `[data-tour="${TOUR.SIDEBAR}"]`,
    title: 'Navigation menu',
    description:
      'Use this menu to get around: Dashboard, Applications, Payments, Transactions, Status, and Settings. On mobile, tap the menu icon in the header to open it.',
  },
  {
    element: `[data-tour="${TOUR.MAIN}"]`,
    title: 'Main content',
    description:
      'Your dashboard, forms, and payment pages appear here. Use the quick actions on the dashboard to jump to Applications, Payments, or Transactions.',
  },
  {
    element: `[data-tour="${TOUR.NOTIFICATIONS}"]`,
    title: 'Notifications',
    description:
      'Click the bell to see updates about your applications and payments. New updates appear here.',
  },
  {
    element: `[data-tour="${TOUR.NAV_SETTINGS}"]`,
    title: 'Settings & help',
    description:
      'Update your profile and preferences in Settings. You can restart this tour anytime from Settings.',
  },
  {
    element: 'body',
    title: "You're all set",
    description:
      'Explore the portal at your own pace. Need a reminder? Go to Settings and click "Take the tour again".',
  },
];
