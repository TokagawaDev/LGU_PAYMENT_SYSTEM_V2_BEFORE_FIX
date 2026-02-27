import './global.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/use-auth';
import { RouteLoadingProvider } from '@/components/molecules/route-loading-context';
import { RouteLoadingOverlay } from '@/components/molecules/route-loading-overlay';
import { fetchPublicSettings } from '@/lib/settings';

export async function generateMetadata() {
  const settings = await fetchPublicSettings({
    next: { tags: ['settings'] },
  });
  return {
    title: `${settings.city.fullName} ${settings.branding.systemName}`,
    description: settings.branding.systemDescription,
    icons: [{ rel: 'icon', url: settings.assets.faviconUrl }],
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <AuthProvider>
          <RouteLoadingProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
            <RouteLoadingOverlay />
          </RouteLoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
