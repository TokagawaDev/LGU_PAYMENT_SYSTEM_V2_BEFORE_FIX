export type PublicSettings = {
  city: { name: string; fullName: string };
  branding: {
    systemName: string;
    systemDescription: string;
  };
  assets: {
    headerBackgroundUrl: string;
    sealLogoUrl: string;
    faviconUrl: string;
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  faq: Array<{
    question: string;
    answer: string;
    category: 'general' | 'payment' | 'technical' | 'account';
  }>;
  updatedAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const DEFAULT_SETTINGS: PublicSettings = {
  city: { name: 'LGU', fullName: 'Local Government Unit' },
  branding: {
    systemName: 'Payment System',
    systemDescription: 'Online Payment Portal',
  },
  assets: {
    headerBackgroundUrl: '/homepage-header.jpg',
    sealLogoUrl: '/seal-logo.svg',
    faviconUrl: '/favicon.ico',
  },
  contact: {
    address: '',
    phone: '',
    email: '',
    website: '',
  },
  faq: [],
  updatedAt: new Date().toISOString(),
};

export async function fetchPublicSettings(options?: { next?: { revalidate?: number; tags?: string[] }; forceRefresh?: boolean }): Promise<PublicSettings> {
  try {
    const url = options?.forceRefresh 
      ? `${API_BASE_URL}/settings/public?t=${Date.now()}` 
      : `${API_BASE_URL}/settings/public`;
    
    const res = await fetch(url, {
      method: 'GET',
      next: options?.next,
      cache: options?.forceRefresh ? 'no-store' : undefined,
      // do not include credentials; public endpoint
    });
    if (!res.ok) {
      console.warn('Failed to load settings from API, using defaults');
      return DEFAULT_SETTINGS;
    }
    return res.json();
  } catch (error) {
    console.warn('Failed to fetch settings:', error);
    return DEFAULT_SETTINGS;
  }
}



