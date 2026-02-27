'use client';

import * as React from 'react';

const PAGE_WRAPPER_CLASS =
  'min-h-screen w-full min-w-0 overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-100/80 antialiased';
const MAIN_CLASS =
  'max-w-4xl mx-auto w-full min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10';

interface CitizenPageLayoutProps {
  children: React.ReactNode;
  /** Optional extra class for the outer wrapper */
  className?: string;
  /** Optional extra class for main */
  mainClassName?: string;
}

/**
 * Shared page layout for citizen portal (private user) pages.
 * Keeps wrapper and main structure consistent and avoids duplication.
 */
export function CitizenPageLayout({
  children,
  className = '',
  mainClassName = '',
}: CitizenPageLayoutProps): React.JSX.Element {
  return (
    <div className={`${PAGE_WRAPPER_CLASS} ${className}`.trim()}>
      <main className={`${MAIN_CLASS} ${mainClassName}`.trim()}>
        {children}
      </main>
    </div>
  );
}
