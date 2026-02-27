import { fetchPublicSettings } from '@/lib/settings';
import RegisterClient from './pageClient';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const settings = await fetchPublicSettings({
    next: { tags: ['settings'] },
  });
  return <RegisterClient settings={settings} />;
}
