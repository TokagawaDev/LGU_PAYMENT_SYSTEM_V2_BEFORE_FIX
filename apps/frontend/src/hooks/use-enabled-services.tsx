'use client';

import { useEffect, useState } from 'react';
import {
  PAYMENT_SERVICES,
  PaymentServiceConfig,
} from '@/constants/payment-services';
import { ServiceDefinition } from '@shared/constants/services';
import { getIconForServiceTitle, getColorForIcon } from '@/lib/utils/icon-mapper';

interface CustomPaymentService {
  id: string;
  title: string;
  description: string;
  baseAmount: number;
  processingFee: number;
  enabled: boolean;
  formFields: Array<{
    id: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      message?: string;
    };
  }>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface UseEnabledServicesReturn {
  enabledServices: ServiceDefinition[];
  enabledPaymentServices: PaymentServiceConfig[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnabledServices(): UseEnabledServicesReturn {
  const [enabledServices, setEnabledServices] = useState<ServiceDefinition[]>(
    []
  );
  const [enabledPaymentServices, setEnabledPaymentServices] = useState<
    PaymentServiceConfig[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnabledServices = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/settings/enabled-services`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch enabled services');
      }

      const services: ServiceDefinition[] = await response.json();
      setEnabledServices(services);

      // Filter payment services based on enabled services
      const enabledServiceIds = services.map((service) => service.id);
      const filteredPaymentServices = Object.values(PAYMENT_SERVICES).filter(
        (service) => service && enabledServiceIds.includes(service.id)
      );

      // Fetch custom titles and merge with payment services
      const servicesWithCustomTitles = await Promise.all(
        filteredPaymentServices.map(async (service) => {
          try {
            const configRes = await fetch(
              `${API_BASE_URL}/settings/form-config/${service.id}`,
              { credentials: 'include' }
            );
            if (configRes.ok) {
              const customConfig = await configRes.json();
              if (customConfig?.title) {
                return {
                  ...service,
                  title: customConfig.title,
                  description: customConfig.description || service.description,
                };
              }
            }
          } catch {
            // Ignore errors, use default config
          }
          return service;
        })
      );

      // Fetch enabled custom payment services from public endpoint
      // This is optional - if it fails, we continue without custom services
      let customServices: PaymentServiceConfig[] = [];
      try {
        const customServicesRes = await fetch(
          `${API_BASE_URL}/custom-payment-services/public/enabled`,
          { 
            credentials: 'include',
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ).catch((fetchError) => {
          // Handle network errors
          console.warn('Network error fetching custom payment services:', fetchError);
          return null;
        });
        
        if (customServicesRes && customServicesRes.ok) {
          try {
            const enabledCustomServices: CustomPaymentService[] = await customServicesRes.json();
            if (Array.isArray(enabledCustomServices)) {
              customServices = enabledCustomServices.map((customService): PaymentServiceConfig => {
                // Convert formFields to FormFieldConfig format
                const formFields = (customService.formFields || []).map((field) => ({
                  id: field.id,
                  label: field.label,
                  type: field.type,
                  required: field.required ?? false,
                  placeholder: field.placeholder,
                  options: field.options,
                  validation: field.validation,
                }));

                // Auto-generate icon based on service title
                const iconName = getIconForServiceTitle(customService.title);
                const iconColor = getColorForIcon(iconName);

                return {
                  id: customService.id as any, // Custom services have string IDs, not ServiceId enum
                  title: customService.title,
                  description: customService.description || '',
                  icon: iconName, // Auto-generated icon based on title
                  color: iconColor, // Auto-generated color based on icon
                  formFields,
                  baseAmount: customService.baseAmount || 0,
                  processingFee: customService.processingFee || 0,
                };
              });
            }
          } catch (jsonError) {
            console.warn('Error parsing custom payment services JSON:', jsonError);
          }
        } else if (customServicesRes) {
          // If endpoint returns non-ok status, log but don't throw
          console.warn(`Failed to fetch custom payment services: ${customServicesRes.status} ${customServicesRes.statusText}`);
        }
      } catch (error) {
        // Silently handle all errors - custom services are optional
        console.warn('Failed to fetch custom payment services:', error);
        // Continue without custom services if fetch fails
      }

      // Merge standard and custom payment services
      const allEnabledServices = [...servicesWithCustomTitles, ...customServices];
      setEnabledPaymentServices(allEnabledServices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Fallback to all services if API fails
      setEnabledServices([]);
      setEnabledPaymentServices(
        Object.values(PAYMENT_SERVICES).filter(Boolean)
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchEnabledServices();
  }, []);

  return {
    enabledServices,
    enabledPaymentServices,
    isLoading,
    error,
    refetch: fetchEnabledServices,
  };
}
