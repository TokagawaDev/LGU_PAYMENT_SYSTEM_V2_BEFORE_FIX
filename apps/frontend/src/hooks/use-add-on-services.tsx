'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { CustomApplicationService, ApplicationForm } from '@/lib/api/admin';

/** Stable fingerprint for custom application services list to avoid unnecessary state updates and flicker */
function getApplicationFormsFingerprint(list: CustomApplicationService[]): string {
  return JSON.stringify(
    list.map((s) => ({
      id: s.id,
      visible: s.visible,
      title: s.title,
      fl: s.formFields?.length ?? 0,
      sl: s.formSteps?.length ?? 0,
    }))
  );
}

// Re-export types for backward compatibility
export type AddOnFormFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'file'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'submit'
  | 'reset';

export interface ConditionalFieldConfig {
  type: string;
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface AddOnFormFieldOption {
  value: string;
  label: string;
  conditionalFields?: ConditionalFieldConfig[];
}

export interface AddOnFormField {
  type: AddOnFormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: AddOnFormFieldOption[];
  stepIndex?: number;
  helpText?: string;
  fieldOrder?: number;
  header?: string;
  description?: string;
  reminder?: string;
}

export interface AddOnFormStep {
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
}

// Backward compatibility: AddOnService is now CustomApplicationService
export type AddOnService = CustomApplicationService;

export interface UseAddOnServicesReturn {
  addOnServices: CustomApplicationService[];
  isLoading: boolean;
  error: string | null;
  refetch: (silent?: boolean) => Promise<void>;
}

/**
 * Fetches custom application services (e.g. Community Tax Certificate) from the custom-application-services API.
 * Custom application services are created by admin in Settings > Application Management Setting and shown in Application (citizen portal).
 * 
 * @deprecated This hook name uses legacy terminology. Consider using useApplicationForms() instead.
 */
export function useAddOnServices(): UseAddOnServicesReturn {
  const [addOnServices, setAddOnServices] = useState<CustomApplicationService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFingerprintRef = useRef<string>('');

  const fetchAddOnServices = useCallback(async (silent = false): Promise<void> => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const response = await fetch(`${API_BASE_URL}/custom-application-services/public/visible`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch custom application services: ${response.status} ${response.statusText}`);
      }
      const data: CustomApplicationService[] = await response.json();
      const processedData = Array.isArray(data) ? data : [];
      const fingerprint = getApplicationFormsFingerprint(processedData);
      // Only update state when data actually changed to prevent flicker from silent refetch
      if (fingerprint !== lastFingerprintRef.current) {
        lastFingerprintRef.current = fingerprint;
        setAddOnServices(processedData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('Error fetching custom application services:', err);
      // In silent mode (e.g. periodic refetch), do not set error state so transient
      // network failures (e.g. backend restart, tab in background) do not overwrite
      // the UI with "Failed to fetch" and we keep showing last good data.
      if (!silent) {
        setError(errorMessage);
        lastFingerprintRef.current = '';
        setAddOnServices([]);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchAddOnServices();
  }, [fetchAddOnServices]);

  // Create a stable refetch function that supports silent mode
  const refetch = useCallback((silent = false) => {
    return fetchAddOnServices(silent);
  }, [fetchAddOnServices]);

  return {
    addOnServices,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetches custom application services from the custom-application-services API.
 * This is the preferred hook name for fetching custom application services.
 */
export function useApplicationForms(): UseAddOnServicesReturn {
  return useAddOnServices();
}
