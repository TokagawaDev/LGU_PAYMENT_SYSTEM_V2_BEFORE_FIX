import { fetchPublicSettings } from '@/lib/settings';
import AdminLoginClient from './pageClient';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const settings = await fetchPublicSettings({
    next: { tags: ['settings'] },
  });
  return <AdminLoginClient settings={settings} />;
}
