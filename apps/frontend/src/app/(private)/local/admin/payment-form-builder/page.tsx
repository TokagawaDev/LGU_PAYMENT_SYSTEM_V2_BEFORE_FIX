'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminHeader from '@/components/molecules/admin-header';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { apiFetch } from '@/lib/api';
import { SERVICES, ServiceId } from '@shared/constants/services';
import { useRequireAuth } from '@/hooks/use-auth';
import {
  AdminSettings,
  ServicesTab,
} from '@/components/molecules/admin-settings-tabs';

export default function PaymentFormBuilderPage() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Check permission
  React.useEffect(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const hasPermission = isSuperAdmin || user?.permissions?.includes('payment_management_setting');
    if (!hasPermission) {
      router.push(ROUTES.ADMIN.DASHBOARD);
      toast.error('You do not have permission to access this page');
    }
  }, [user, router]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await apiFetch<AdminSettings>('/settings');

      // Initialize enabledServices if it doesn't exist
      if (!data.enabledServices) {
        const enabledServices: Record<ServiceId, boolean> = {} as Record<
          ServiceId,
          boolean
        >;
        SERVICES.forEach((service) => {
          enabledServices[service.id] = true;
        });
        data.enabledServices = enabledServices;
      }

      setSettings(data);
      return data;
    } catch (error) {
      toast.error('Failed to load settings');
      throw error;
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSaveWithCustomPaymentServices = async (customPaymentServices: NonNullable<AdminSettings['customPaymentServices']>) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await apiFetch<AdminSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          customPaymentServices,
        }),
      });
      setSettings(updated);
      toast.success('Custom payment services saved');
      await loadSettings();
      return updated;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const cleanFaq = (settings.faq || []).filter(
        (i) => i.question.trim().length > 0 && i.answer.trim().length > 0
      );
      const c = settings.contact || {
        address: '',
        phone: '',
        email: '',
        website: '',
      };
      const contact = {
        address: c.address?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        email: c.email?.trim() || undefined,
        website: c.website?.trim() || undefined,
      };
      const city = {
        name: settings.city.name,
        fullName: settings.city.fullName,
      };
      const branding = {
        systemName: settings.branding.systemName,
        systemDescription: settings.branding.systemDescription,
      };
      const faq = cleanFaq.map((item) => ({
        question: item.question,
        answer: item.answer,
        category: item.category,
      }));

      const updated = await apiFetch<AdminSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          city,
          branding,
          contact,
          faq,
          enabledServices: settings.enabledServices,
          customPaymentServices: settings.customPaymentServices,
          // Don't include addOnServices - that's for application-form-builder page
        }),
      });
      setSettings(updated);
      toast.success('Settings saved');
      await loadSettings();
      return updated;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Custom icon component combining CreditCard and Pencil
  const CardPenIcon = ({ className }: { className?: string }) => (
    <div className={`relative ${className || ''}`}>
      <CreditCard className="h-8 w-8 text-blue-600" />
      <Pencil className="h-4 w-4 text-blue-600 absolute -bottom-1 -right-1 bg-white rounded-full p-0.5" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <AdminHeader title="Payment Management Setting" backHref={ROUTES.ADMIN.DASHBOARD} icon={CardPenIcon} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management Setting</h1>
          <p className="text-gray-600">Manage payment services and their configurations</p>
        </div>
        
        <div className="space-y-6">
          <ServicesTab
            settings={settings}
            onSettingsChange={setSettings}
            onSave={handleSave}
            onSaveWithCustomPaymentServices={handleSaveWithCustomPaymentServices}
            isSaving={isSaving}
          />
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button 
              onClick={() => handleSave()} 
              disabled={isSaving}
              className="min-w-[140px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all duration-200"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
