'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/molecules/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceFormStep } from '@/components/organism/service-form-step';
import { ReviewStep } from '@/components/organism/review-step';
import { PaymentStep } from '@/components/organism/payment-step';
import { ReceiptStep } from '@/components/organism/receipt-step';
import { FormStep } from '@/constants/payment-services';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/use-auth';
import { useEnabledServices } from '@/hooks/use-enabled-services';
import { usePaymentStepper } from '@/hooks/use-payment-stepper';
import { useRouteLoading } from '@/components/molecules/route-loading-context';

/**
 * Dynamic service page that handles all payment services
 * Implements the form > review > payment > receipt flow with breadcrumb navigation
 */
export default function ServicePage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { enabledPaymentServices, isLoading: servicesLoading } =
    useEnabledServices();
  const { startRouteTransition, stopRouteTransition } = useRouteLoading();

  const serviceId = params.serviceId as string;

  // Use the payment stepper hook for all state and logic
  const {
    currentStep,
    completedSteps,
    formData,
    pendingFiles,
    isLoading,
    transactionId,
    serviceConfig,
    isServiceEnabled,
    isLoadingConfig,
    handleInputChange,
    handleFileSelect,
    handleFormSubmit,
    handleConfirmReview,
    handlePaymentSubmit,
    handleBackToForm,
    handleBackToReview,
    handleStepNavigation,
  } = usePaymentStepper(serviceId, enabledPaymentServices);

  // Global overlay control: show overlay until auth/services/config ready
  useEffect(() => {
    if (authLoading || servicesLoading || isLoadingConfig) {
      startRouteTransition();
    } else {
      stopRouteTransition();
    }
  }, [authLoading, servicesLoading, isLoadingConfig, startRouteTransition, stopRouteTransition]);

  // Redirect unauthenticated users except when returning from payment to receipt step
  if (!isAuthenticated && currentStep !== 'receipt') {
    startRouteTransition();
    router.push(ROUTES.HOME);
    return <div></div>;
  }

  // Wait for config to load before checking
  if (isLoadingConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading service...</p>
        </div>
      </div>
    );
  }

  // Handle invalid service ID or disabled service (only after config is loaded)
  if (!serviceConfig || !isServiceEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {!serviceConfig ? 'Service Not Found' : 'Service Unavailable'}
          </h1>
          <p className="text-gray-600 mb-6">
            {!serviceConfig
              ? 'The requested service could not be found.'
              : 'This service is currently unavailable.'}
          </p>
          <Button onClick={() => router.push(ROUTES.SERVICES)}>
            Back to Payments
          </Button>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = (): void => {
    router.push(ROUTES.SERVICES);
  };

  const handleViewTransactionHistory = (): void => {
    router.push(ROUTES.TRANSACTION_HISTORY);
  };

  const renderCurrentStep = (): React.JSX.Element => {
    if (!serviceConfig) {
      return <div>Service not found</div>;
    }

    switch (currentStep) {
      case 'form':
        return (
          <ServiceFormStep
            serviceConfig={serviceConfig}
            formData={formData}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onFileSelect={handleFileSelect}
            onSubmit={handleFormSubmit}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      case 'review':
        return (
          <ReviewStep
            serviceConfig={serviceConfig}
            formData={formData}
            isLoading={isLoading}
            onConfirm={handleConfirmReview}
            onBackToForm={handleBackToForm}
          />
        );
      case 'payment':
        return (
          <PaymentStep
            serviceConfig={serviceConfig}
            isLoading={isLoading}
            onPaymentSubmit={handlePaymentSubmit}
            onBackToReview={handleBackToReview}
            overrideBaseAmount={
              (serviceConfig.formFields || []).some((f) => f.type === 'cost')
                ? Math.max(
                    0,
                    Number(
                      formData[
                        serviceConfig.formFields.find((f) => f.type === 'cost')
                          ?.id as string
                      ] || 0
                    )
                  )
                : undefined
            }
          />
        );
      case 'receipt':
        return (
          <ReceiptStep
            serviceConfig={serviceConfig}
            transactionId={
              transactionId || searchParams.get('transactionId') || ''
            }
            onViewTransactionHistory={handleViewTransactionHistory}
            onBackToDashboard={handleBackToDashboard}
          />
        );
      default:
        return (
          <ServiceFormStep
            serviceConfig={serviceConfig}
            formData={formData}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleFormSubmit}
            onBackToDashboard={handleBackToDashboard}
          />
        );
    }
  };

  if (!serviceConfig) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                Service Not Found
              </h1>
              <p className="text-gray-600 mb-6">
                The requested service could not be found.
              </p>
              <Button onClick={() => router.push(ROUTES.SERVICES)}>
                Back to Payments
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepNavigation}
        />

        {/* Step Content */}
        {renderCurrentStep()}
      </main>
    </div>
  );
}
