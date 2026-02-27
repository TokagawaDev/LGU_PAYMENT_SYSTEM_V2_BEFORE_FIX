'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_USER_PAGE } from '@/constants/routes';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Default page for the citizen portal.
 * Redirects authenticated users to the default landing page (dashboard).
 */
export default function DefaultPage(): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEFAULT_USER_PAGE);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
