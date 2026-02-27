/**
 * Payment Stepper Service
 * Handles API calls and business logic for the payment stepper flow
 */

import { PaymentServiceConfig } from '@/constants/payment-services';
import { getServiceConfig } from '@/constants/payment-services';
import { getIconForServiceTitle, getColorForIcon } from '@/lib/utils/icon-mapper';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface PendingFilesMap {
  [key: string]: File | undefined;
}

/**
 * Fetches service configuration from backend
 * Tries custom payment service endpoint first, then falls back to standard service config
 * Returns the config and whether it's a custom service (which means it's enabled)
 */
export async function fetchServiceConfig(
  serviceId: string
): Promise<{ config: PaymentServiceConfig | null; isCustomService: boolean }> {
  try {
    console.log('[PaymentStepper] Fetching config for serviceId:', serviceId);
    
    // URL encode the service ID to handle special characters
    const encodedServiceId = encodeURIComponent(serviceId);
    const customUrl = `${API_BASE_URL}/custom-payment-services/public/${encodedServiceId}`;
    console.log('[PaymentStepper] Trying custom service endpoint:', customUrl);

    let cfg: any = null;
    let isCustomService = false;
    
    // Try custom payment service endpoint first
    try {
      const customRes = await fetch(customUrl, { credentials: 'include' });
      
      if (customRes.ok) {
        const responseData = await customRes.json();
        console.log('[PaymentStepper] Custom service response:', responseData);
        // Backend should return service data if found and enabled
        if (responseData && responseData.title && Array.isArray(responseData.formFields)) {
          cfg = responseData;
          isCustomService = true; // If fetched from public endpoint, it's enabled
          console.log('[PaymentStepper] Custom service config loaded successfully');
        } else {
          console.warn('[PaymentStepper] Custom service response invalid:', responseData);
        }
      } else {
        // Log status for debugging
        console.log(`[PaymentStepper] Custom service fetch returned status ${customRes.status} for ${serviceId}`);
      }
    } catch (error) {
      console.warn('Error fetching custom payment service:', error);
    }
    
    // If custom service not found or disabled, try standard service config endpoint
    if (!cfg) {
      try {
        const standardRes = await fetch(
          `${API_BASE_URL}/settings/form-config/${serviceId}`,
          { credentials: 'include' }
        );
        if (standardRes.ok) {
          const responseData = await standardRes.json();
          if (responseData && responseData.title) {
            cfg = responseData;
          }
        }
      } catch (error) {
        console.warn('Error fetching standard service config:', error);
      }
    }

    if (cfg && cfg.title && Array.isArray(cfg.formFields)) {
      console.log('[PaymentStepper] Returning config for service:', cfg.title);
      
      // Auto-generate icon and color based on service title
      const iconName = isCustomService ? getIconForServiceTitle(cfg.title) : 'FileText';
      const iconColor = isCustomService ? getColorForIcon(iconName) : 'bg-indigo-500';
      
      return {
        config: {
          id: serviceId as unknown as PaymentServiceConfig['id'],
          title: cfg.title,
          description: cfg.description || '',
          icon: iconName,
          color: iconColor,
          formFields: cfg.formFields,
          baseAmount: Number(cfg.baseAmount) || 0,
          processingFee: Number(cfg.processingFee) || 0,
        },
        isCustomService,
      };
    }

    // Fallback to predefined config
    console.log('[PaymentStepper] Falling back to predefined config for:', serviceId);
    const fallbackConfig = getServiceConfig(serviceId);
    if (fallbackConfig) {
      console.log('[PaymentStepper] Found predefined config:', fallbackConfig.title);
    } else {
      console.warn('[PaymentStepper] No predefined config found for:', serviceId);
    }
    return {
      config: fallbackConfig,
      isCustomService: false,
    };
  } catch (error) {
    console.error('Error fetching service config:', error);
    // Fallback to predefined config
    const fallbackConfig = getServiceConfig(serviceId);
    return {
      config: fallbackConfig,
      isCustomService: false,
    };
  }
}

/**
 * Uploads files for file fields in the form
 * Returns a map of field IDs to uploaded file keys
 */
export async function uploadFiles(
  fileFields: Array<{ id: string }>,
  pendingFiles: PendingFilesMap,
  serviceId: string
): Promise<Record<string, string>> {
  const uploadedData: Record<string, string> = {};

  for (const field of fileFields) {
    const pending = pendingFiles[field.id];
    if (!pending) continue;

    try {
      // Get presigned URL
      const presignRes = await fetch(`${API_BASE_URL}/uploads/presign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: pending.type,
          maxBytes: pending.size,
          keyPrefix: `service/${serviceId}`,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Failed to authorize upload');
      }

      const { key, uploadUrl } = (await presignRes.json()) as {
        key: string;
        uploadUrl: string;
      };

      // Upload file
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': pending.type },
        body: pending,
      });

      if (!putRes.ok) {
        throw new Error('Upload failed');
      }

      uploadedData[field.id] = key;
    } catch (error) {
      console.error(`Failed to upload file for field ${field.id}:`, error);
      throw error;
    }
  }

  return uploadedData;
}

/**
 * Calculates convenience fee based on payment method and amount
 */
export async function calculateConvenienceFee(
  method: 'card' | 'digital-wallets' | 'dob' | 'qrph',
  baseAndProcessing: number
): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/public`);
    if (!res.ok) {
      return 0;
    }

    const settings = await res.json();
    const fee = settings?.convenienceFee;
    if (!fee) {
      return 0;
    }

    const pick =
      method === 'card'
        ? fee.card
        : method === 'digital-wallets'
        ? fee.digitalWallets
        : method === 'dob'
        ? fee.dob
        : fee.qrph;

    const percent = Number(pick?.percent || 0);
    const fixed = Number(pick?.fixed || 0);
    const min = Number(pick?.min || 0);

    const computed = Math.max(
      (percent / 100) * baseAndProcessing + fixed,
      min
    );

    return Math.round(computed * 100); // Return in minor units (centavos)
  } catch (error) {
    console.error('Error calculating convenience fee:', error);
    return 0;
  }
}
