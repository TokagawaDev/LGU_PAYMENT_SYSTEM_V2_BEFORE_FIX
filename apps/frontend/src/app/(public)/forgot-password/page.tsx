import { ForgotPasswordClient } from './pageClient';
import { fetchPublicSettings } from '@/lib/settings';

export default async function ForgotPasswordPage() {
  const settings = await fetchPublicSettings();
  return <ForgotPasswordClient settings={settings} />;
}
