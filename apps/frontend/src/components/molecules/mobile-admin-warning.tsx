'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type MobileAdminWarningProps = {
  minWidth?: number;
};

/**
 * Shows a blocking dialog on small screens informing users that
 * the admin experience is optimized for larger displays.
 */
export default function MobileAdminWarning({
  minWidth = 1024,
}: MobileAdminWarningProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const isSmall = window.innerWidth < minWidth;
      setIsOpen(isSmall);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [minWidth]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>For the best experience</DialogTitle>
          <DialogDescription>
            The admin dashboard works best on a laptop or desktop screen. Some
            features may be hard to use on mobile devices.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground text-center">
          Please switch to a larger device for optimal visibility and control.
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setIsOpen(false)} variant="default">
            Continue anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
