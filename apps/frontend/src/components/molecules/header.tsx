'use client';

import HeaderClient from './header-client';

interface HeaderProps {
  /** Whether to show the back button */
  showBackButton?: boolean;
  /** The text for the back button */
  backButtonText?: string;
  /** The route to navigate to when back button is clicked */
  backButtonRoute?: string;
  /** Whether to show the profile menu */
  showProfileMenu?: boolean;
  /** The user's name to display */
  userName?: string;
  /** Callback for profile menu actions */
  onProfileMenuAction?: (action: string) => void;
}

/**
 * Reusable header component for private pages
 * Displays the municipal logo, name, and optional navigation elements
 */
export function Header(props: HeaderProps): React.JSX.Element {
  return <HeaderClient {...props} />;
}
