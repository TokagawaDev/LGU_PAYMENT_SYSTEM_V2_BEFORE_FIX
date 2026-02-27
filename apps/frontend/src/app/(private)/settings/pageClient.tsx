'use client';

import { useState, useCallback } from 'react';
import { SettingsForm } from '@/components/molecules/settings-form';
import { useAuth } from '@/hooks/use-auth';
import { changeUserPassword, updateUserProfile } from '@/lib/api';
import { useCitizenTutorial } from '@/components/molecules/citizen-tutorial-context';
import { Button } from '@/components/ui/button';
import { Compass, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsClient() {
  const { user, refreshUser } = useAuth();
  const tutorial = useCitizenTutorial();
  const [isStartingTour, setIsStartingTour] = useState(false);

  const handleStartTour = useCallback(async () => {
    if (!tutorial || isStartingTour) return;
    setIsStartingTour(true);
    try {
      const started = await tutorial.startTutorial();
      if (!started) {
        toast.error('Could not start the tour. Please try again.');
      }
    } catch {
      toast.error('Could not start the tour. Please try again.');
    } finally {
      setIsStartingTour(false);
    }
  }, [tutorial, isStartingTour]);

  return (
    <div>
      <div className="relative z-10 flex flex-col items-center justify-start px-4 py-4 md:py-6 lg:py-6 overflow-y-auto">
        <div className="w-full max-w-4xl flex-1 flex flex-col items-stretch gap-6">
          {tutorial && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Guided tour
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  See key features and navigation again
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 min-w-[10rem]"
                onClick={handleStartTour}
                disabled={isStartingTour}
                aria-busy={isStartingTour}
                aria-label={isStartingTour ? 'Starting tour…' : 'Take the tour again'}
              >
                {isStartingTour ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Compass className="h-4 w-4 mr-2" />
                    Take the tour again
                  </>
                )}
              </Button>
            </div>
          )}
          <SettingsForm
            onSaveProfile={async ({
              firstName,
              middleName,
              lastName,
              contact,
            }) => {
              await updateUserProfile({
                firstName,
                middleName,
                lastName,
                contact,
              });
              await refreshUser();
            }}
            onChangePassword={async ({ currentPassword, newPassword }) => {
              if (!currentPassword || !newPassword) return;
              await changeUserPassword({ currentPassword, newPassword });
            }}
            initialData={{
              email: user?.email || '',
              firstName: user?.firstName || '',
              middleName: user?.middleName || '',
              lastName: user?.lastName || '',
              contact: user?.contact || '',
            }}
          />
        </div>
      </div>
    </div>
  );
}
