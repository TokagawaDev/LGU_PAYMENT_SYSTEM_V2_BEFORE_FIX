import { Suspense } from 'react';
import { ResetPasswordClient } from './pageClient';
import { fetchPublicSettings } from '@/lib/settings';

export default async function ResetPasswordPage() {
  const settings = await fetchPublicSettings();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordClient settings={settings} />
    </Suspense>
  );
}
