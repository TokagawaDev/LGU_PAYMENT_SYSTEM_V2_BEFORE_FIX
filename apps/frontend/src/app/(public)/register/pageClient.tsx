'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RegisterForm } from '@/components/molecules/register-form';
import type { PublicSettings } from '@/lib/settings';

export default function RegisterClient({
  settings,
}: {
  settings: PublicSettings;
}) {
  const [imageError, setImageError] = useState(false);
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="fixed inset-0 z-0">
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 py-4 md:py-6 lg:py-6 overflow-y-auto">
        <div className="text-center text-white mb-4 md:mb-6">
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden">
                <Image
                  src={settings.assets.sealLogoUrl}
                  alt="LGU Logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                <span className="text-blue-400">{settings.city.fullName}</span>
              </h1>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold leading-tight mt-1">
                {settings.branding.systemName}
              </h2>
            </div>
          </div>
        </div>
        <div className="w-full max-w-4xl flex-1 flex items-start justify-center">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
