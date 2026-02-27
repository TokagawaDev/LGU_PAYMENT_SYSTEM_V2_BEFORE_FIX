'use client';

import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function RouteLoadingOverlay(): React.JSX.Element {
  const { isRouteLoading } = useRouteLoading();
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-smooth ease-smooth ${
        isRouteLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isRouteLoading}
      aria-busy={isRouteLoading}
    >
      <LoadingSpinner />
    </div>
  );
}
