'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FilePen } from 'lucide-react';
import AdminHeader from '@/components/molecules/admin-header';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { apiFetch } from '@/lib/api';
import { SERVICES, ServiceId } from '@shared/constants/services';
import { useRequireAuth } from '@/hooks/use-auth';
import {
  AdminSettings,
  AddOnsTab,
} from '@/components/molecules/admin-settings-tabs';
export type StrictAddOn = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  visible?: boolean;
  formFields?: Array<{
    type: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    stepIndex?: number;
    helpText?: string;
    fieldOrder?: number;
    header?: string;
    reminder?: string;
  }>;
  formSteps?: Array<{
    index: number;
    letter: string;
    label: string;
    buttonTexts?: {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    };
    buttonVisibility?: {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    };
  }>;
  buttonTexts?: {
    back?: string;
    next?: string;
    submit?: string;
    saveAsDraft?: string;
    cancel?: string;
  };
  buttonVisibility?: {
    back?: boolean;
    next?: boolean;
    submit?: boolean;
    saveAsDraft?: boolean;
    cancel?: boolean;
  };
};

function normalizeButtonTexts(obj: unknown): {
  back?: string;
  next?: string;
  submit?: string;
  saveAsDraft?: string;
  cancel?: string;
} | undefined {
  if (obj && typeof obj === 'object') {
    const btns = obj as {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    };
    const cleaned: {
      back?: string;
      next?: string;
      submit?: string;
      saveAsDraft?: string;
      cancel?: string;
    } = {};
    if (btns.back) cleaned.back = btns.back;
    if (btns.next) cleaned.next = btns.next;
    if (btns.submit) cleaned.submit = btns.submit;
    if (btns.saveAsDraft) cleaned.saveAsDraft = btns.saveAsDraft;
    if (btns.cancel) cleaned.cancel = btns.cancel;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return undefined;
}

function normalizeButtonVisibility(obj: unknown): {
  back?: boolean;
  next?: boolean;
  submit?: boolean;
  saveAsDraft?: boolean;
  cancel?: boolean;
} | undefined {
  if (obj && typeof obj === 'object') {
    const vis = obj as {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    };
    const cleaned: {
      back?: boolean;
      next?: boolean;
      submit?: boolean;
      saveAsDraft?: boolean;
      cancel?: boolean;
    } = {};
    if (vis.back !== undefined) cleaned.back = vis.back;
    if (vis.next !== undefined) cleaned.next = vis.next;
    if (vis.submit !== undefined) cleaned.submit = vis.submit;
    if (vis.saveAsDraft !== undefined) cleaned.saveAsDraft = vis.saveAsDraft;
    if (vis.cancel !== undefined) cleaned.cancel = vis.cancel;
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return undefined;
}

function normalizeAndMergeAddOns(
  fromServer: Partial<StrictAddOn>[],
  fromState?: Partial<StrictAddOn>[]
): Partial<StrictAddOn>[] {
  const serverMap = new Map<string, Partial<StrictAddOn>>();
  fromServer.forEach((addOn) => {
    if (addOn.id) {
      serverMap.set(addOn.id, addOn);
    }
  });
  const stateMap = new Map<string, Partial<StrictAddOn>>();
  if (fromState) {
    fromState.forEach((addOn) => {
      if (addOn.id && addOn.id !== 'temp-new-form') {
        stateMap.set(addOn.id, addOn);
      }
    });
  }
  const merged: Partial<StrictAddOn>[] = [];
  serverMap.forEach((serverAddOn, id) => {
    const stateAddOn = stateMap.get(id);
    merged.push({
      ...serverAddOn,
      visible: stateAddOn?.visible !== undefined ? stateAddOn.visible : serverAddOn.visible,
    });
  });
  stateMap.forEach((stateAddOn, id) => {
    if (!serverMap.has(id)) {
      merged.push(stateAddOn);
    }
  });
  return merged;
}

export default function ApplicationFormBuilderPage() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  
  // Check permission
  React.useEffect(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const hasPermission = isSuperAdmin || user?.permissions?.includes('application_management_setting');
    if (!hasPermission) {
      router.push(ROUTES.ADMIN.DASHBOARD);
      toast.error('You do not have permission to access this page');
    }
  }, [user, router]);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async (suppressToasts = false, customAddOnServices?: Partial<StrictAddOn>[]) => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const addOnServicesToSave = customAddOnServices ?? settings.addOnServices;
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
      
      const validAddOns = (addOnServicesToSave ?? [])
        .filter((addOn: Partial<StrictAddOn>) => {
          if (addOn.id === 'temp-new-form') return false;
          if (!addOn.id || typeof addOn.id !== 'string') return false;
          const title = addOn.title?.trim();
          if (!title || title.length === 0) return false;
          return true;
        })
        .filter((form: Partial<StrictAddOn>, index: number, self: Partial<StrictAddOn>[]) => 
          index === self.findIndex(f => f.id === form.id)
        );
      
      const cleanAddOnServices = validAddOns.map((addOn: Partial<StrictAddOn>) => {
        const cleaned: Record<string, unknown> = {
          id: (addOn.id as string).trim(),
          title: (addOn.title as string).trim(),
          description: (addOn.description as string)?.trim() || '',
          icon: addOn.icon || 'FileText',
          color: addOn.color || 'bg-blue-500',
          visible: addOn.visible === true,
        };

        if (Array.isArray(addOn.formFields) && addOn.formFields.length > 0) {
          cleaned.formFields = (addOn.formFields as Array<Record<string, unknown>>).map((field) => {
            const cleanedField: Record<string, unknown> = {
              type: field.type,
              label: field.label,
            };
            if (field.placeholder) cleanedField.placeholder = field.placeholder;
            if (field.required !== undefined) cleanedField.required = field.required;
            if (Array.isArray(field.options) && field.options.length > 0) {
              cleanedField.options = (field.options as Array<{ value: string; label: string }>).map((opt) => ({
                value: opt.value,
                label: opt.label,
              }));
            }
            if (typeof field.stepIndex === 'number') cleanedField.stepIndex = field.stepIndex;
            if (field.helpText) cleanedField.helpText = field.helpText;
            if (typeof field.fieldOrder === 'number') cleanedField.fieldOrder = field.fieldOrder;
            if (field.header) cleanedField.header = field.header;
            if (field.reminder) cleanedField.reminder = field.reminder;
            return cleanedField;
          });
        }
        
        if (Array.isArray(addOn.formSteps) && addOn.formSteps.length > 0) {
          cleaned.formSteps = (addOn.formSteps as Array<{
            index: number;
            letter: string;
            label: string;
            buttonTexts?: {
              back?: string;
              next?: string;
              submit?: string;
              saveAsDraft?: string;
              cancel?: string;
            };
            buttonVisibility?: {
              back?: boolean;
              next?: boolean;
              submit?: boolean;
              saveAsDraft?: boolean;
              cancel?: boolean;
            };
          }>).map((step) => {
            const cleanedStep: Record<string, unknown> = {
              index: step.index,
              letter: step.letter,
              label: step.label,
            };
            const normalizedButtonTexts = normalizeButtonTexts(step.buttonTexts);
            if (normalizedButtonTexts) {
              cleanedStep.buttonTexts = normalizedButtonTexts;
            }
            const normalizedButtonVisibility = normalizeButtonVisibility(step.buttonVisibility);
            if (normalizedButtonVisibility) {
              cleanedStep.buttonVisibility = normalizedButtonVisibility;
            }
            return cleanedStep;
          });
        }
        
        const normalizedTopLevelButtonTexts = normalizeButtonTexts(addOn.buttonTexts);
        if (normalizedTopLevelButtonTexts) {
          cleaned.buttonTexts = normalizedTopLevelButtonTexts;
        }
        
        const normalizedTopLevelButtonVisibility = normalizeButtonVisibility(addOn.buttonVisibility);
        if (normalizedTopLevelButtonVisibility) {
          cleaned.buttonVisibility = normalizedTopLevelButtonVisibility;
        }
        
        return cleaned;
      });
      
      const payloadAddOnServices = cleanAddOnServices;

      const updated = await apiFetch<AdminSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          city,
          branding,
          contact,
          faq,
          enabledServices: settings.enabledServices,
          addOnServices: payloadAddOnServices,
        }),
      });
      updated.addOnServices = normalizeAndMergeAddOns(
        updated.addOnServices ?? [],
        (addOnServicesToSave ?? settings.addOnServices) as Partial<StrictAddOn>[]
      );
      setSettings(updated);
      if (!suppressToasts) {
        toast.success('Settings saved');
      }
      if (!customAddOnServices?.length) {
        try {
          await loadSettings();
        } catch {
          // If reload fails, continue with the updated data we already have
        }
      }
      return updated;
    } catch (e) {
      if (!suppressToasts) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <AdminHeader title="Application Management Setting" backHref={ROUTES.ADMIN.DASHBOARD} icon={FilePen} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Management Setting</h1>
          <p className="text-gray-600">Manage application forms and their configurations</p>
        </div>
        
        <div className="space-y-6">
          <AddOnsTab
            settings={settings}
            onSettingsChange={setSettings}
            onSave={async () => {
              await handleSave(true);
            }}
            onSaveWithAddOns={async (addOnServices) => {
              await handleSave(false, addOnServices);
            }}
            isSaving={isSaving}
          />
        </div>
      </main>
    </div>
  );
}
