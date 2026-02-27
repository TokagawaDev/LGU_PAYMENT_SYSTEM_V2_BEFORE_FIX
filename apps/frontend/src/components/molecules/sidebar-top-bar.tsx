'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const TOP_BAR_PADDING = 'px-3 py-3';
const ICON_BUTTON_CLASS =
  'shrink-0 h-10 w-10 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors duration-fast ease-smooth text-gray-600 hover:text-gray-900';
const ICON_SIZE = 'h-5 w-5';

export interface SidebarTopBarProps {
  /** Section title shown when expanded (e.g. "Main", "Quick Actions") */
  sectionTitle: string;
  /** When true, sidebar is collapsed: show only Menu icon (to expand). When false, show title + X (to collapse). */
  isCollapsed: boolean;
  /** Called when user clicks Menu (only visible when collapsed) — expand sidebar, show icons + words and X */
  onExpand: () => void;
  /** Called when user clicks X (only visible when expanded) — collapse sidebar, show only icons and Menu */
  onCollapseOrClose: () => void;
  /** Optional class for the top bar wrapper */
  className?: string;
}

/**
 * Shared top bar for sidebars (citizen and admin).
 * Collapsed: only Menu icon (expand). Expanded: section title + X icon (collapse). No duplication of controls.
 */
export function SidebarTopBar({
  sectionTitle,
  isCollapsed,
  onExpand,
  onCollapseOrClose,
  className = '',
}: SidebarTopBarProps): React.JSX.Element {
  return (
    <div
      className={`flex shrink-0 items-center border-b border-gray-200 bg-white sticky top-0 z-10 ${TOP_BAR_PADDING} ${
        isCollapsed ? 'justify-center' : 'justify-between'
      } ${className}`.trim()}
      role="group"
      aria-label="Sidebar controls"
    >
      {isCollapsed ? (
        <Button
          variant="ghost"
          size="icon"
          className={ICON_BUTTON_CLASS}
          onClick={onExpand}
          title="Expand menu"
          aria-label="Expand menu"
        >
          <Menu className={ICON_SIZE} />
        </Button>
      ) : (
        <>
          <span className="flex-1 min-w-0 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate">
            {sectionTitle}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            onClick={onCollapseOrClose}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <X className={ICON_SIZE} />
          </Button>
        </>
      )}
    </div>
  );
}
