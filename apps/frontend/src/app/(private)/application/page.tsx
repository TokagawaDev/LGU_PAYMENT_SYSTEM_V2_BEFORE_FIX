'use client';

import * as React from 'react';
import Link from 'next/link';
import { CitizenPageLayout } from '@/components/molecules/citizen-page-layout';
import { DynamicBusinessPermitForm } from '@/components/organism/dynamic-business-permit-form';
import { useAddOnServices } from '@/hooks/use-add-on-services';
import { useAddOnSubmissions } from '@/hooks/use-add-on-submissions';
import type { AddOnFormField } from '@/hooks/use-add-on-services';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { CheckCircle2, FileText, Building2, ArrowLeft } from 'lucide-react';

function validateRequiredFields(
  data: Record<string, string | string[]>,
  formFields: AddOnFormField[]
): { valid: boolean; firstMissingLabel?: string } {
  // Group fields by step and sort by fieldOrder to match renderField's index
  const fieldsByStep: Record<number, AddOnFormField[]> = {};
  formFields.forEach((field) => {
    const stepIndex = field.stepIndex ?? 0;
    if (!fieldsByStep[stepIndex]) {
      fieldsByStep[stepIndex] = [];
    }
    fieldsByStep[stepIndex].push(field);
  });
  Object.keys(fieldsByStep).forEach((stepIdx) => {
    const idx = parseInt(stepIdx, 10);
    fieldsByStep[idx].sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));
  });
  
  for (const [stepIdx, stepFields] of Object.entries(fieldsByStep)) {
    const stepIndex = parseInt(stepIdx, 10);
    for (let i = 0; i < stepFields.length; i++) {
      const field = stepFields[i];
      if (!field.required) continue;
      const fieldId = `field-${stepIndex}-${i}`;
      const value = data[fieldId];
      const isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && !value.trim()) ||
        (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return { valid: false, firstMissingLabel: field.label };
      }
    }
  }
  return { valid: true };
}

/**
 * Application page for the LGU Payment System (citizen portal).
 * Renders the Application form. Auth is enforced by private layout.
 * Uses customizable form from add-ons if available, otherwise uses default form.
 * Submissions are stored as add-on submissions (addOnId: business-permit).
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  FileText,
};

export default function ApplicationPage(): React.JSX.Element {
  const { addOnServices, isLoading, refetch } = useAddOnServices();
  const { create, isLoading: isSubmitting } = useAddOnSubmissions();
  const [submitted, setSubmitted] = React.useState(false);
  const [selectedFormId, setSelectedFormId] = React.useState<string | null>(null);

  // Track if initial load is complete to avoid flickering during periodic refetches
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  // Refetch forms periodically to get newly created forms (silent refresh)
  React.useEffect(() => {
    // Mark initial load as complete after first load
    if (!isLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isLoading, isInitialLoad]);

  React.useEffect(() => {
    // Only start periodic refetch after initial load is complete
    if (isInitialLoad) return;

    const interval = setInterval(() => {
      // Use silent refresh to avoid flickering
      void refetch(true);
    }, 10000); // Refetch every 10 seconds (reduced frequency to minimize impact)

    return () => clearInterval(interval);
  }, [refetch, isInitialLoad]);

  // Get available application forms (including business-permit) - deduplicated by ID and filtered by visibility
  const availableForms = React.useMemo(() => {
    return addOnServices
      .filter((addOn) => {
        // Exclude temp forms
        if (addOn.id === 'temp-new-form') return false;
        // Must have valid id and title
        if (!addOn.id || !addOn.title || !addOn.title.trim()) return false;
        // Only show when explicitly visible (default hidden)
        if (addOn.visible !== true) return false;
        // Must have form fields and steps to be usable
        if (!addOn.formFields || !Array.isArray(addOn.formFields) || addOn.formFields.length === 0) return false;
        if (!addOn.formSteps || !Array.isArray(addOn.formSteps) || addOn.formSteps.length === 0) return false;
        return true;
      })
      .filter((form, index, self) => 
        // Keep only the first occurrence of each ID to prevent duplicates
        index === self.findIndex(f => f.id === form.id)
      );
  }, [addOnServices]);

  const selectedForm = React.useMemo(() => {
    if (!selectedFormId) return null;
    return addOnServices.find((addOn) => addOn.id === selectedFormId);
  }, [selectedFormId, addOnServices]);

  const handleSubmit = React.useCallback(
    async (data: Record<string, string | string[]>) => {
      if (!selectedForm?.formFields?.length) return;
      const { valid, firstMissingLabel } = validateRequiredFields(
        data,
        selectedForm.formFields
      );
      if (!valid) {
        toast.error(
          firstMissingLabel
            ? `Please fill in required field: ${firstMissingLabel}`
            : 'Please fill in all required fields.'
        );
        return;
      }
      const formDataForApi = data as Record<string, unknown>;
      const result = await create({
        customApplicationServiceId: selectedForm.id,
        status: 'submitted',
        formData: formDataForApi,
      });
      if ('data' in result) {
        setSubmitted(true);
        toast.success('Application submitted successfully.');
      } else {
        toast.error(result.error || 'Failed to submit application. Please try again.');
      }
    },
    [selectedForm, create]
  );

  const handleSaveDraft = React.useCallback(
    async (data: Record<string, string | string[]>) => {
      if (!selectedForm?.id) return;
      const formDataForApi = data as Record<string, unknown>;
      const result = await create({
        customApplicationServiceId: selectedForm.id,
        status: 'draft',
        formData: formDataForApi,
      });
      if ('data' in result) {
        toast.success('Draft saved. You can continue later from Applications.');
      } else {
        toast.error(result.error || 'Failed to save draft. Please try again.');
      }
    },
    [selectedForm, create]
  );

  const handleFormSelect = (formId: string) => {
    setSelectedFormId(formId);
    setSubmitted(false);
  };

  const handleBackToTiles = () => {
    setSelectedFormId(null);
    setSubmitted(false);
  };

  if (isLoading) {
    return (
      <CitizenPageLayout>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gray-200" />
              <div className="h-7 w-48 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-full max-w-xl bg-gray-100 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="h-5 w-32 bg-gray-200 rounded mt-2 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded mt-2 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CitizenPageLayout>
    );
  }

  // Show form if one is selected
  if (selectedForm) {
    if (submitted) {
      return (
        <CitizenPageLayout>
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                Application submitted
              </h1>
              <p className="mt-2 text-gray-600">
                Your {selectedForm.title} application has been received. You can track
                or submit another application from the links below.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline" className="min-h-10">
                  <Link href={ROUTES.DASHBOARD}>Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-10">
                  <Link href={ROUTES.APPLICATION}>View your applications</Link>
                </Button>
                <Button
                  className="min-h-10 bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleBackToTiles}
                >
                  Submit another application
                </Button>
              </div>
            </div>
          </div>
        </CitizenPageLayout>
      );
    }

    return (
      <CitizenPageLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToTiles}
            className="gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Application Forms
          </Button>
          <DynamicBusinessPermitForm
            title={selectedForm.title || ''}
            description={selectedForm.description || ''}
            formSteps={selectedForm.formSteps ?? []}
            formFields={selectedForm.formFields ?? []}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            isSubmitting={isSubmitting}
            buttonTexts={selectedForm.buttonTexts}
            buttonVisibility={selectedForm.buttonVisibility}
          />
        </div>
      </CitizenPageLayout>
    );
  }

  // Show tile layout for available forms
  return (
    <CitizenPageLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Application Forms</h1>
          </div>
          <p className="text-gray-600">
            Select an application form below to get started. Fill out the required information and submit your application.
          </p>
        </div>

        {availableForms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableForms.map((form) => {
              const IconComponent = ICON_MAP[form.icon] ?? FileText;
              return (
                <Card
                  key={form.id}
                  className="group bg-white cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-gray-200 hover:border-indigo-300 shadow-md"
                  onClick={() => handleFormSelect(form.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-xl ${form.color || 'bg-gradient-to-br from-indigo-500 to-purple-600'} text-white flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                          {form.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-gray-700 text-sm leading-relaxed mb-4">
                      {form.description || 'Fill out this form to submit your application.'}
                    </CardDescription>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{form.formFields?.length || 0} fields</span>
                      <span className="text-indigo-600 font-medium">Click to apply →</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-2 border-gray-200 bg-white shadow-md">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-gray-100">
                  <FileText className="h-10 w-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No application forms available</h3>
                  <p className="text-sm text-gray-600">
                    Application forms will appear here once they are created by the administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CitizenPageLayout>
  );
}
