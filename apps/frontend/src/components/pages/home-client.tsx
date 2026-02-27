'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LoginForm } from '@/components/molecules/login-form';
import type { PublicSettings } from '@/lib/settings';
import { CITIZEN_PORTAL_LABEL } from '@/constants/routes';

type Props = {
  settings: PublicSettings;
};

export default function HomeClient({ settings }: Props) {
  const [imageError, setImageError] = useState(false);
  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="relative h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 z-0">
          {!imageError ? (
            <Image
              src={settings.assets.headerBackgroundUrl}
              alt="LGU Payment System"
              fill
              className="object-cover"
              priority
              sizes="100vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-blue-950" />
          )}
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            <div className="text-center lg:text-center text-white">
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex justify-center lg:justify-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                      <Image
                        src={settings.assets.sealLogoUrl}
                        alt="LGU Logo"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    <span className="text-blue-400">
                      {settings.city.fullName}
                    </span>
                  </h1>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                    {settings.branding.systemName}
                  </h2>
                  <div className="mt-4">
                    <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 backdrop-blur-sm rounded-full border border-blue-400/30">
                      <span className="text-blue-300 text-lg font-semibold">
                        {CITIZEN_PORTAL_LABEL}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
