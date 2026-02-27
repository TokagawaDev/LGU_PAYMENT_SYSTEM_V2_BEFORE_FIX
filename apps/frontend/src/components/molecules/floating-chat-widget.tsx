'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useOptionalUserShell } from '@/components/molecules/user-shell-context';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WIDGET_Z = 40;

/**
 * Sticky floating chat icon and panel for the Citizen Portal.
 * Renders in the lower-right corner with smooth animation; does not block sidebar or modals.
 */
export function FloatingChatWidget(): React.JSX.Element {
  const shell = useOptionalUserShell();
  const [isOpen, setIsOpen] = React.useState(false);

  const openSupportDialog = (): void => {
    setIsOpen(false);
    shell?.openDialog('support');
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={cn(
          'fixed z-[40] flex flex-col overflow-hidden rounded-t-xl border border-gray-200 border-b-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out',
          'bottom-[calc(56px+env(safe-area-inset-bottom)+8px)] right-[max(1rem,env(safe-area-inset-right))]',
          'w-[min(calc(100vw-2rem),380px)] max-h-[min(70vh,420px)]',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
        style={{ zIndex: WIDGET_Z }}
        role="dialog"
        aria-label="Chat support"
        aria-hidden={!isOpen}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Chat support</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Need help? Our team is here for you. Use the button below to view contact options, send an email, or call support.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full gap-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50 hover:border-indigo-300 text-indigo-800"
            onClick={openSupportDialog}
          >
            <MessageCircle className="h-4 w-4" />
            Contact support
          </Button>
        </div>
      </div>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'fixed flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-out',
          'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
          'bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]'
        )}
        style={{ zIndex: WIDGET_Z + 1 }}
        aria-label={isOpen ? 'Close chat support' : 'Open chat support'}
        aria-expanded={isOpen}
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
      </button>
    </>
  );
}
