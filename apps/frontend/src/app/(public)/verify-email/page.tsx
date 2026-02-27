import { Suspense } from 'react';
import { VerifyEmailClient } from './pageClient';
import { fetchPublicSettings } from '@/lib/settings';

export default async function VerifyEmailPage() {
  const settings = await fetchPublicSettings();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailClient settings={settings} />
    </Suspense>
  );
}
