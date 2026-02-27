'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminHeader from '@/components/molecules/admin-header';
import { toast } from 'react-hot-toast';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { SERVICES, ServiceId } from '@shared/constants/services';
import { useRequireAuth } from '@/hooks/use-auth';
import {
  AdminSettings,
  BrandingTab,
  ContactTab,
  FaqTab,
  AssetsTab,
} from '@/components/molecules/admin-settings-tabs';

const VALID_SETTINGS_TABS = ['branding', 'contact', 'faq', 'assets'] as const;

type AddOnService = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  visible?: boolean;
  formFields?: unknown[];
  formSteps?: unknown[];
  buttonTexts?: Record<string, string>;
  buttonVisibility?: Record<string, boolean>;
};

export type ButtonTexts = {
  back?: string;
  next?: string;
  submit?: string;
  saveAsDraft?: string;
  cancel?: string;
};

export type ButtonVisibility = {
  back?: boolean;
  next?: boolean;
  submit?: boolean;
  saveAsDraft?: boolean;
  cancel?: boolean;
};

export type FormStep = {
  index: number;
  letter: string;
  label: string;
  buttonTexts?: ButtonTexts;
  buttonVisibility?: ButtonVisibility;
};

export type FormField = {
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  stepIndex?: number;
};

export type StrictAddOn = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  visible?: boolean;
  formFields?: FormField[];
  formSteps?: FormStep[];
  buttonTexts?: ButtonTexts;
  buttonVisibility?: ButtonVisibility;
};

/**
 * Normalize buttonTexts to ensure type safety and remove undefined values.
 */
function normalizeButtonTexts(obj: unknown): ButtonTexts | undefined {
  if (obj && typeof obj === 'object') {
    const btns = obj as ButtonTexts;
    const cleaned: ButtonTexts = {};
    if (btns.back) cleaned.back = btns.back;
    if (btns.next) cleaned.next = btns.next;
    if (btns.submit) cleaned.submit = btns.submit;
    if (btns.saveAsDraft) cleaned.saveAsDraft = btns.saveAsDraft;
    if (btns.cancel) cleaned.cancel = btns.cancel;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return undefined;
}

/**
 * Normalize buttonVisibility to ensure type safety and remove undefined values.
 */
function normalizeButtonVisibility(obj: unknown): ButtonVisibility | undefined {
  if (obj && typeof obj === 'object') {
    const visibility = obj as ButtonVisibility;
    const cleaned: ButtonVisibility = {};
    if (visibility.back !== undefined) cleaned.back = visibility.back;
    if (visibility.next !== undefined) cleaned.next = visibility.next;
    if (visibility.submit !== undefined) cleaned.submit = visibility.submit;
    if (visibility.saveAsDraft !== undefined) cleaned.saveAsDraft = visibility.saveAsDraft;
    if (visibility.cancel !== undefined) cleaned.cancel = visibility.cancel;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return undefined;
}

/**
 * Normalize backend add-ons to StrictAddOn shape and merge visible flags from previous state.
 * Ensures description, icon, and color are always strings, and preserves visible toggle state.
 * Also normalizes buttonTexts and buttonVisibility in formSteps and top-level addOn.
 */
function normalizeAndMergeAddOns(
  addOns: Partial<StrictAddOn>[] = [],
  prevAddOns?: Partial<StrictAddOn>[]
): StrictAddOn[] {
  // Normalize incoming add-ons
  const normalized: StrictAddOn[] = addOns
    .filter((a) => a.id && a.title) // Filter out invalid entries
    .map((addOn): StrictAddOn => ({
      id: addOn.id!,
      title: addOn.title || '',
      description: addOn.description ?? '',
      icon: addOn.icon ?? 'FileText',
      color: addOn.color ?? 'bg-blue-500',
      visible: addOn.visible,
      formFields: addOn.formFields as FormField[] | undefined,
      formSteps: (addOn.formSteps ?? []).map((step): FormStep => ({
        index: (step as FormStep).index,
        letter: (step as FormStep).letter,
        label: (step as FormStep).label,
        buttonTexts: normalizeButtonTexts((step as FormStep).buttonTexts),
        buttonVisibility: normalizeButtonVisibility((step as FormStep).buttonVisibility),
      })),
      buttonTexts: normalizeButtonTexts(addOn.buttonTexts),
      buttonVisibility: normalizeButtonVisibility(addOn.buttonVisibility),
    }));

  // If no previous add-ons, return normalized
  if (!prevAddOns?.length) return normalized;

  // Normalize previous add-ons to ensure description is always a string
  const normalizedPrev: StrictAddOn[] = prevAddOns
    .filter((a) => a.id && a.title)
    .map((addOn): StrictAddOn => ({
      id: addOn.id!,
      title: addOn.title || '',
      description: addOn.description ?? '',
      icon: addOn.icon ?? 'FileText',
      color: addOn.color ?? 'bg-blue-500',
      visible: addOn.visible,
      formFields: addOn.formFields as FormField[] | undefined,
      formSteps: (addOn.formSteps ?? []).map((step): FormStep => ({
        index: (step as FormStep).index,
        letter: (step as FormStep).letter,
        label: (step as FormStep).label,
        buttonTexts: normalizeButtonTexts((step as FormStep).buttonTexts),
        buttonVisibility: normalizeButtonVisibility((step as FormStep).buttonVisibility),
      })),
      buttonTexts: normalizeButtonTexts(addOn.buttonTexts),
      buttonVisibility: normalizeButtonVisibility(addOn.buttonVisibility),
    }));

  // Merge previous visibility state
  const prevMap = new Map(normalizedPrev.map((a) => [a.id, a.visible]));

  return normalized.map((addOn) => ({
    ...addOn,
    visible: prevMap.get(addOn.id) ?? addOn.visible,
  }));
}

export default function AdminSettingsPage() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Check permission
  React.useEffect(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const hasPermission = isSuperAdmin || user?.permissions?.includes('manage_settings');
    if (!hasPermission) {
      router.push(ROUTES.ADMIN.DASHBOARD);
      toast.error('You do not have permission to access this page');
    }
  }, [user, router]);
  const tabParam = searchParams.get('tab');
  const defaultTab = useMemo(
    () =>
      (VALID_SETTINGS_TABS as readonly string[]).includes(tabParam ?? '')
        ? (tabParam as (typeof VALID_SETTINGS_TABS)[number])
        : 'branding',
    [tabParam]
  );
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<
    null | 'header' | 'seal' | 'favicon'
  >(null);

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

      setSettings((prev) => {
        data.addOnServices = normalizeAndMergeAddOns(
          (data.addOnServices ?? []) as Partial<StrictAddOn>[],
          prev?.addOnServices as Partial<StrictAddOn>[] | undefined
        );
        return data;
      });
      return data;
    } catch (error) {
      toast.error('Failed to load settings');
      throw error;
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleUpload = async (
    file: File,
    kind: 'header' | 'seal' | 'favicon'
  ) => {
    if (!file) return;
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE_URL}/settings/assets`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = (await res.json()) as { url: string };
      const updatePayload: Partial<AdminSettings> = {
        assets: {
          headerBackgroundUrl: settings?.assets.headerBackgroundUrl || '',
          sealLogoUrl: settings?.assets.sealLogoUrl || '',
          faviconUrl: settings?.assets.faviconUrl || '',
        },
      };
      if (kind === 'header' && updatePayload.assets) {
        updatePayload.assets.headerBackgroundUrl = url;
      }
      if (kind === 'seal' && updatePayload.assets) {
        updatePayload.assets.sealLogoUrl = url;
      }
      if (kind === 'favicon' && updatePayload.assets) {
        updatePayload.assets.faviconUrl = url;
      }

      const updated = await apiFetch<AdminSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      });
      setSettings(updated);
      toast.success('Asset updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSaveText = async (suppressToasts = false) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      // Remove incomplete FAQ items to avoid validation errors
      const cleanFaq = (settings.faq || []).filter(
        (i) => i.question.trim().length > 0 && i.answer.trim().length > 0
      );
      // Build contact object without empty strings
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

      // Don't include addOnServices - that's only for application-form-builder page
      // Don't include enabledServices - that's only for payment-form-builder page
      const updated = await apiFetch<AdminSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          city,
          branding,
          contact,
          faq,
        }),
      });
      setSettings(updated);
      if (!suppressToasts) {
        toast.success('Settings saved');
      }
      try {
        await loadSettings();
      } catch {
        // If reload fails, continue with the updated data we already have
      }
      return updated;
    } catch (e) {
      if (!suppressToasts) {
        // Show error toast for manual "Save Changes" button clicks
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
      // Re-throw the error so the caller (like Apply button) can handle it
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="System Settings" backHref={ROUTES.ADMIN.DASHBOARD} icon={SettingsIcon} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <Tabs
              value={defaultTab}
              onValueChange={(v) => router.replace(`${pathname}?tab=${v}`)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 items-center justify-evenly rounded-lg bg-gray-100 p-1 mb-6 w-full">
                <TabsTrigger value="branding">
                  Branding
                </TabsTrigger>
                <TabsTrigger value="contact">
                  Contact
                </TabsTrigger>
                <TabsTrigger value="faq">
                  FAQ
                </TabsTrigger>
                <TabsTrigger value="assets">
                  Assets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="mt-6">
                <BrandingTab
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={async () => {
                    await handleSaveText();
                  }}
                  isSaving={isSaving}
                />
                <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={() => handleSaveText()} 
                    disabled={isSaving}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-6">
                <ContactTab
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={async () => {
                    await handleSaveText();
                  }}
                  isSaving={isSaving}
                />
                <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={() => handleSaveText()} 
                    disabled={isSaving}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="faq" className="mt-6">
                <FaqTab
                  settings={settings}
                  onSettingsChange={setSettings}
                  onSave={async () => {
                    await handleSaveText();
                  }}
                  isSaving={isSaving}
                />
                <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={() => handleSaveText()} 
                    disabled={isSaving}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="assets" className="mt-6">
                <AssetsTab
                  settings={settings}
                  onSettingsChange={setSettings}
                  onUpload={handleUpload}
                  uploading={uploading}
                  onSave={async () => {
                    await handleSaveText();
                  }}
                  isSaving={isSaving}
                />
                <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={() => handleSaveText()} 
                    disabled={isSaving}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
