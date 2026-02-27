'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormStep, PaymentServiceConfig } from '@/constants/payment-services';
import { normalizeToServiceId } from '@shared/constants/services';
import { ROUTES } from '@/constants/routes';
import { initiatePayment, cancelPayment } from '@/lib/api';
import { fetchServiceConfig, uploadFiles, calculateConvenienceFee } from '@/lib/services/payment-stepper.service';
import toast from 'react-hot-toast';

export interface FormData {
  [key: string]: string;
}

export interface PendingFilesMap {
  [key: string]: File | undefined;
}

export interface UsePaymentStepperReturn {
  // State
  currentStep: FormStep;
  completedSteps: FormStep[];
  formData: FormData;
  pendingFiles: PendingFilesMap;
  isLoading: boolean;
  transactionId: string;
  serviceConfig: PaymentServiceConfig | null;
  isServiceEnabled: boolean;
  isLoadingConfig: boolean;

  // Actions
  setCurrentStep: (step: FormStep) => void;
  handleInputChange: (fieldId: string, value: string) => void;
  handleFileSelect: (field: { id: string }, file: File | null) => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleConfirmReview: () => void;
  handlePaymentSubmit: (method: 'card' | 'digital-wallets' | 'dob' | 'qrph') => Promise<void>;
  handleBackToForm: () => void;
  handleBackToReview: () => void;
  handleStepNavigation: (step: FormStep) => void;
  resetFlow: () => void;
}

export function usePaymentStepper(
  serviceId: string,
  enabledPaymentServices: PaymentServiceConfig[]
): UsePaymentStepperReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step') as FormStep;

  const [currentStep, setCurrentStep] = useState<FormStep>(stepParam || 'form');
  const [completedSteps, setCompletedSteps] = useState<FormStep[]>([]);
  const [formData, setFormData] = useState<FormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<PendingFilesMap>({});
  const [serviceConfig, setServiceConfig] = useState<PaymentServiceConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isServiceEnabled, setIsServiceEnabled] = useState(false);
  const isUploadingRef = useRef<boolean>(false);

  // Update URL step
  const updateUrlStep = useCallback((step: FormStep): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', step);
    window.history.pushState({}, '', url.toString());
  }, []);

  // Load service configuration
  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const { config, isCustomService } = await fetchServiceConfig(serviceId);
        if (isMounted && config) {
          setServiceConfig(config);
          
          // Check if service is enabled
          // For custom services: if fetched from public endpoint, it's enabled
          // For standard services: check if they exist in enabledPaymentServices array
          if (isCustomService) {
            // Custom service fetched from public endpoint means it's enabled
            setIsServiceEnabled(true);
          } else {
            // Standard service: check if it's in enabledPaymentServices
            const isInEnabledList = enabledPaymentServices.some(
              (service) => service.id === serviceId
            );
            setIsServiceEnabled(isInEnabledList);
          }
        } else {
          if (isMounted) {
            setServiceConfig(null);
            setIsServiceEnabled(false);
          }
        }
      } catch (error) {
        console.error('Failed to load service config:', error);
        if (isMounted) {
          setServiceConfig(null);
          setIsServiceEnabled(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingConfig(false);
        }
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, [serviceId, enabledPaymentServices]);

  // Sync step from URL
  useEffect(() => {
    if (stepParam && stepParam !== currentStep) {
      setCurrentStep(stepParam);
    }
  }, [stepParam, currentStep]);

  // Reset flow when reset=1 is in URL
  useEffect(() => {
    const reset = searchParams.get('reset');
    if (currentStep === 'form' && reset === '1') {
      setFormData({});
      setCompletedSteps([]);
      setTransactionId('');
      const url = new URL(window.location.href);
      url.searchParams.delete('reset');
      url.searchParams.delete('transactionId');
      url.searchParams.set('step', 'form');
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentStep, searchParams]);

  // Handle cancelled payment return
  useEffect(() => {
    const tid = searchParams.get('transactionId');
    if (currentStep === 'payment' && tid) {
      (async () => {
        try {
          await cancelPayment(tid);
        } catch {
          // ignore
        } finally {
          setCurrentStep('receipt');
          updateUrlStep('receipt');
        }
      })();
    }
  }, [currentStep, searchParams, updateUrlStep]);

  const handleInputChange = useCallback((fieldId: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const handleFileSelect = useCallback((field: { id: string }, file: File | null): void => {
    setPendingFiles((prev) => {
      const next: PendingFilesMap = { ...prev };
      if (file) {
        next[field.id] = file;
      } else {
        delete next[field.id];
      }
      return next;
    });
  }, []);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      if (!serviceConfig) return;

      setIsLoading(true);

      // Validate required fields
      const missing: string[] = (serviceConfig.formFields || [])
        .filter((f) => f.required)
        .filter((f) => {
          if (f.type === 'file') {
            const hasUploadedKey = String(formData[f.id] ?? '').trim().length > 0;
            const hasPending = Boolean(pendingFiles[f.id]);
            return !(hasUploadedKey || hasPending);
          }
          return !String(formData[f.id] ?? '').trim();
        })
        .map((f) => f.label || f.id);

      // Validate cost field if present
      const costField = (serviceConfig.formFields || []).find((f) => f.type === 'cost');
      if (costField) {
        const amount = Number(formData[costField.id] || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          setIsLoading(false);
          window.alert('Please enter a valid amount greater than 0.');
          return;
        }
      }

      if (missing.length > 0) {
        setIsLoading(false);
        window.alert('Please fill out all required fields.');
        return;
      }

      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, 'form']);
        setCurrentStep('review');
        updateUrlStep('review');
        setIsLoading(false);
      }, 300);
    },
    [serviceConfig, formData, pendingFiles, updateUrlStep]
  );

  const handleConfirmReview = useCallback((): void => {
    setIsLoading(true);
    setTimeout(() => {
      setCompletedSteps((prev) => [...prev, 'review']);
      setCurrentStep('payment');
      updateUrlStep('payment');
      setIsLoading(false);
    }, 300);
  }, [updateUrlStep]);

  const handlePaymentSubmit = useCallback(
    async (method: 'card' | 'digital-wallets' | 'dob' | 'qrph'): Promise<void> => {
      if (!serviceConfig) return;

      setIsLoading(true);
      try {
        // Validate required fields
        const missing: string[] = (serviceConfig.formFields || [])
          .filter((f) => f.required)
          .filter((f) => !String(formData[f.id] ?? '').trim())
          .map((f) => f.label || f.id);

        if (missing.length > 0) {
          toast.error('Error occurred. Please check the form');
          setIsLoading(false);
          return;
        }

        const normalizedServiceId = normalizeToServiceId(serviceId);
        if (!normalizedServiceId && !serviceConfig) {
          throw new Error('Invalid service');
        }

        const successUrl = `${window.location.origin}${ROUTES.SERVICES}/${serviceId}?step=receipt`;
        const cancelUrl = `${window.location.origin}${ROUTES.SERVICES}/${serviceId}?step=payment`;

        // Calculate amounts
        const costField = (serviceConfig.formFields || []).find((f) => f.type === 'cost');
        const baseAmount = Number(serviceConfig.baseAmount) || 0;
        const processingFee = Number(serviceConfig.processingFee) || 0;
        
        let userCost: number;
        if (costField) {
          // If there's a cost field, get the value from form data
          const costValue = Number(formData[costField.id] || 0);
          if (!Number.isFinite(costValue) || costValue <= 0) {
            toast.error('Please enter a valid amount greater than 0 for the cost field');
            setIsLoading(false);
            return;
          }
          userCost = costValue;
        } else {
          // Use baseAmount from service config
          userCost = baseAmount;
          // Validate baseAmount if no cost field
          if (!Number.isFinite(userCost) || userCost < 0) {
            toast.error('Invalid service amount configuration');
            setIsLoading(false);
            return;
          }
        }

        // Validate processing fee
        if (!Number.isFinite(processingFee) || processingFee < 0) {
          toast.error('Invalid processing fee configuration');
          setIsLoading(false);
          return;
        }

        const baseAndProcessing = userCost + processingFee;

        // Calculate convenience fee
        const convenienceMinor = await calculateConvenienceFee(method, baseAndProcessing);

        // Build breakdown items
        const breakdownItems = [
          {
            code: 'base' as const,
            label: 'Service Fee',
            amountMinor: Math.round(userCost * 100),
          },
          {
            code: 'processing_fee' as const,
            label: 'Processing Fee',
            amountMinor: Math.round(processingFee * 100),
          },
        ];

        if (convenienceMinor > 0) {
          breakdownItems.push({
            code: 'processing_fee' as const,
            label: 'Convenience Fee',
            amountMinor: convenienceMinor,
          });
        }

        const totalAmountMinor = breakdownItems.reduce(
          (sum, i) => sum + i.amountMinor,
          0
        );

        // Validate total amount before submitting
        if (!Number.isFinite(totalAmountMinor) || totalAmountMinor <= 0) {
          console.error('[PaymentStepper] Invalid total amount:', {
            totalAmountMinor,
            userCost,
            processingFee,
            convenienceMinor,
            breakdownItems,
            costField: costField?.id,
            formDataCostValue: costField ? formData[costField.id] : undefined,
          });
          toast.error('Invalid payment amount. Please check the service configuration.');
          setIsLoading(false);
          return;
        }

        console.log('[PaymentStepper] Payment breakdown:', {
          userCost,
          processingFee,
          convenienceMinor,
          totalAmountMinor,
          breakdownItems,
        });

        // Upload files if any
        const formDataForSubmit: Record<string, string> = { ...formData };
        const fileFields = (serviceConfig.formFields || []).filter((f) => f.type === 'file');
        
        if (fileFields.length > 0) {
          isUploadingRef.current = true;
          try {
            const uploadedData = await uploadFiles(
              fileFields,
              pendingFiles,
              serviceConfig.id
            );
            Object.assign(formDataForSubmit, uploadedData);
            
            // Clear pending files after successful upload
            setPendingFiles((prev) => {
              const next: PendingFilesMap = { ...prev };
              for (const f of fileFields) delete next[f.id];
              return next;
            });
            
            // Sync UI state
            setFormData((prev) => ({ ...prev, ...uploadedData }));
          } catch (error) {
            throw new Error('Failed to upload files');
          } finally {
            isUploadingRef.current = false;
          }
        }

        // Initiate payment
        const { checkoutUrl, transactionId: txId } = await initiatePayment({
          serviceId,
          serviceName: serviceConfig.title,
          approvalRequired: false,
          breakdown: breakdownItems,
          totalAmountMinor,
          formData: formDataForSubmit,
          paymentMethod: method,
          successUrl,
          cancelUrl,
        });

        // Save transaction ID and redirect
        setTransactionId(txId);
        setCompletedSteps((prev) => [...prev, 'payment']);
        window.location.href = checkoutUrl;
      } catch (err) {
        console.error(err);
        toast.error('Error occurred. Please check the form');
      } finally {
        setIsLoading(false);
      }
    },
    [serviceConfig, formData, pendingFiles, serviceId, updateUrlStep]
  );

  const handleBackToForm = useCallback((): void => {
    setCurrentStep('form');
    updateUrlStep('form');
  }, [updateUrlStep]);

  const handleBackToReview = useCallback((): void => {
    const tid = searchParams.get('transactionId');
    if (tid) {
      cancelPayment(tid).catch(() => void 0);
    }
    setCurrentStep('review');
    updateUrlStep('review');
  }, [searchParams, updateUrlStep]);

  const handleStepNavigation = useCallback(
    (step: FormStep): void => {
      if (completedSteps.includes(step) || step === currentStep) {
        setCurrentStep(step);
        updateUrlStep(step);
      }
    },
    [completedSteps, currentStep, updateUrlStep]
  );

  const resetFlow = useCallback((): void => {
    setFormData({});
    setCompletedSteps([]);
    setTransactionId('');
    setPendingFiles({});
    setCurrentStep('form');
    updateUrlStep('form');
  }, [updateUrlStep]);

  return {
    // State
    currentStep,
    completedSteps,
    formData,
    pendingFiles,
    isLoading,
    transactionId,
    serviceConfig,
    isServiceEnabled,
    isLoadingConfig,

    // Actions
    setCurrentStep,
    handleInputChange,
    handleFileSelect,
    handleFormSubmit,
    handleConfirmReview,
    handlePaymentSubmit,
    handleBackToForm,
    handleBackToReview,
    handleStepNavigation,
    resetFlow,
  };
}
