import { fetchPublicSettings } from '@/lib/settings';
import HomeClient from '@/components/pages/home-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await fetchPublicSettings({
    next: { tags: ['settings'] },
  });
  return <HomeClient settings={settings} />;
}
