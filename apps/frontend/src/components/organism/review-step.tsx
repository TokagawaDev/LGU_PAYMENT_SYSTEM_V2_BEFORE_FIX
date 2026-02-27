'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentServiceConfig } from '@/constants/payment-services';
import { ArrowLeft } from 'lucide-react';

interface FormData {
  [key: string]: string;
}

interface ReviewStepProps {
  serviceConfig: PaymentServiceConfig;
  formData: FormData;
  isLoading: boolean;
  onConfirm: () => void;
  onBackToForm: () => void;
}

/**
 * Review Step Component
 * Displays a summary of submitted information for user confirmation
 */
export function ReviewStep({
  serviceConfig,
  formData,
  isLoading,
  onConfirm,
  onBackToForm,
}: ReviewStepProps): React.JSX.Element {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Review and Confirm
        </CardTitle>
        <p className="text-gray-600">
          Please review your information before proceeding to payment
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Information */}
        <div>
          <h3 className="text-lg font-medium mb-4">Service Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p>
              <strong>Service:</strong> {serviceConfig.title}
            </p>
            <p>
              <strong>Description:</strong> {serviceConfig.description}
            </p>
          </div>
        </div>

        {/* Form Data Review */}
        <div>
          <h3 className="text-lg font-medium mb-4">Submitted Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {serviceConfig.formFields.map((field) => {
              const value = formData[field.id];
              if (!value) return null;

              let displayValue = value;
              if (field.type === 'select' && field.options) {
                const option = field.options.find((opt) => opt.value === value);
                displayValue = option ? option.label : value;
              }

              if (field.type === 'file') {
                const key = value;
                const isPendingPlaceholder = key.startsWith('pending:');
                if (isPendingPlaceholder) {
                  const filename =
                    key.slice('pending:'.length) || 'selected file';
                  return (
                    <p key={field.id}>
                      <strong>{field.label}:</strong> {filename}
                    </p>
                  );
                }
                const handleView = async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/uploads/view?key=${encodeURIComponent(
                        key
                      )}`,
                      { credentials: 'include' }
                    );
                    if (!res.ok) return;
                    const { url } = (await res.json()) as { url: string };
                    if (url) window.open(url, '_blank');
                  } catch {
                    // ignore
                  }
                };
                return (
                  <div key={field.id} className="flex items-center gap-2">
                    <p>
                      <strong>{field.label}:</strong> Uploaded file
                    </p>
                    <button
                      className="text-blue-600 underline text-xs"
                      type="button"
                      onClick={handleView}
                    >
                      View
                    </button>
                  </div>
                );
              }

              return (
                <p key={field.id}>
                  <strong>{field.label}:</strong> {displayValue}
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBackToForm}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Form
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
