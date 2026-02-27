'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { Building2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  AddOnFormField,
  AddOnFormStep,
  ConditionalFieldConfig,
} from '@/hooks/use-add-on-services';

function hasAtLeastOneFieldFilled(data: Record<string, string | string[]>): boolean {
  return Object.values(data).some((v) => {
    if (Array.isArray(v)) return v.length > 0 && v.some((x) => String(x).trim() !== '');
    return typeof v === 'string' && v.trim() !== '';
  });
}

interface StepIndicatorProps {
  currentStep: number;
  steps: AddOnFormStep[];
}

function StepIndicator({ currentStep, steps }: StepIndicatorProps): React.JSX.Element {
  return (
    <nav
      className="mb-6 sm:mb-8 rounded-xl bg-gray-50/80 border border-gray-100 px-3 py-4 sm:px-5 sm:py-5"
      aria-label="Application progress"
    >
      <div className="flex flex-wrap items-end justify-center gap-1 sm:gap-3">
        {steps.map((step, index) => (
          <React.Fragment key={step.index}>
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300 shrink-0 self-center mb-5 sm:mb-6 flex-shrink-0"
                aria-hidden
              />
            )}
            <div className="flex flex-col items-center min-w-0 flex-shrink-0">
              <div
                className={`
                  flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold
                  transition-all duration-200 ease-out
                  ${
                    step.index === currentStep
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400/40'
                      : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
                  }
                `}
                aria-current={step.index === currentStep ? 'step' : undefined}
              >
                {step.letter}
              </div>
              <span
                className={`
                  mt-2 sm:mt-2.5 text-center text-[11px] leading-tight font-medium sm:text-sm max-w-[68px] sm:max-w-[100px] md:max-w-none truncate sm:whitespace-normal sm:overflow-visible
                  ${step.index === currentStep ? 'text-gray-900' : 'text-gray-500'}
                `}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

function Label({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 mb-1.5 tracking-tight ${className}`}
    >
      {children}
    </label>
  );
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-4">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2.5 cursor-pointer py-1 min-h-[2.25rem] sm:min-h-0"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 rounded-full border-gray-300 text-rose-600 focus:ring-2 focus:ring-rose-500/30 focus:ring-offset-1"
          />
          <span className="text-sm text-gray-700 select-none">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

interface DynamicBusinessPermitFormProps {
  title: string;
  description: string;
  formSteps: AddOnFormStep[];
  formFields: AddOnFormField[];
  onSubmit?: (data: Record<string, string | string[]>) => void;
  /** Called when user saves a draft; draft is only saved when at least one field has a value */
  onSaveDraft?: (data: Record<string, string | string[]>) => void;
  /** When true, submit button shows loading and is disabled */
  isSubmitting?: boolean;
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

/**
 * Dynamic Business Permit Application form that uses add-on configuration.
 * Supports multi-step forms with customizable fields.
 */
export function DynamicBusinessPermitForm({
  title,
  description,
  formSteps,
  formFields,
  onSubmit,
  onSaveDraft,
  isSubmitting = false,
  buttonTexts,
  buttonVisibility,
}: DynamicBusinessPermitFormProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<Record<string, string | string[]>>({});

  const sortedSteps = React.useMemo(() => {
    return [...formSteps].sort((a, b) => a.index - b.index);
  }, [formSteps]);

  const fieldsByStep = React.useMemo(() => {
    const grouped: Record<number, AddOnFormField[]> = {};
    formFields.forEach((field) => {
      const stepIndex = field.stepIndex ?? 0;
      if (!grouped[stepIndex]) {
        grouped[stepIndex] = [];
      }
      grouped[stepIndex].push(field);
    });
    // Sort fields within each step by fieldOrder
    Object.keys(grouped).forEach((stepIdx) => {
      const idx = parseInt(stepIdx, 10);
      grouped[idx].sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));
    });
    return grouped;
  }, [formFields]);

  const currentStepIndex = sortedSteps[currentStep]?.index ?? 0;
  const currentFields = fieldsByStep[currentStepIndex] ?? [];
  const isLastStep = currentStep === sortedSteps.length - 1;
  const currentStepConfig = sortedSteps[currentStep];

  const getStepButtonText = (buttonType: 'back' | 'next' | 'submit' | 'saveAsDraft' | 'cancel'): string => {
    if (currentStepConfig?.buttonTexts?.[buttonType]) {
      return currentStepConfig.buttonTexts[buttonType] ?? '';
    }
    return buttonTexts?.[buttonType] ?? 
      (buttonType === 'back' ? 'Back' : 
       buttonType === 'next' ? 'Next' : 
       buttonType === 'submit' ? 'Submit Application' : 
       buttonType === 'saveAsDraft' ? 'Save as Draft' : 'Cancel');
  };

  const getStepButtonVisibility = (buttonType: 'back' | 'next' | 'submit' | 'saveAsDraft' | 'cancel'): boolean => {
    if (currentStepConfig?.buttonVisibility?.[buttonType] !== undefined) {
      return currentStepConfig.buttonVisibility[buttonType] ?? false;
    }
    return buttonVisibility?.[buttonType] ?? 
      (buttonType === 'back' || buttonType === 'next' || buttonType === 'submit' ? true : false);
  };

  const goNext = (): void => {
    if (isLastStep) {
      onSubmit?.(formData);
    } else {
      setCurrentStep((s) => Math.min(s + 1, sortedSteps.length - 1));
    }
  };

  const goBack = (): void => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const canSaveDraft = hasAtLeastOneFieldFilled(formData);

  const handleSaveDraftClick = (): void => {
    if (!canSaveDraft) {
      toast.error('At least one field is required to save a draft.');
      return;
    }
    onSaveDraft?.(formData);
  };

  const handleFieldChange = (fieldId: string, value: string | string[]): void => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderConditionalFields = (
    parentFieldId: string,
    optValue: string,
    conditionalFields: ConditionalFieldConfig[]
  ): React.ReactNode => {
    if (!conditionalFields?.length) return null;
    return (
      <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-3">
        {conditionalFields.map((cf, cfIndex) => {
          const condFieldId = `${parentFieldId}-cond-${optValue}-${cfIndex}`;
          const condValue = formData[condFieldId] ?? (cf.type === 'checkbox' ? [] : '');
          const cfType = cf.type || 'text';
          const cfOpts = Array.isArray(cf.options) ? cf.options : [];
          return (
            <div key={condFieldId}>
              <Label>{cf.label}</Label>
              {cfType === 'textarea' ? (
                <Textarea
                  placeholder={cf.placeholder}
                  rows={4}
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                />
              ) : cfType === 'number' ? (
                <Input
                  type="number"
                  placeholder={cf.placeholder}
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                />
              ) : cfType === 'email' ? (
                <Input
                  type="email"
                  placeholder={cf.placeholder}
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                />
              ) : cfType === 'date' ? (
                <Input
                  type="date"
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                />
              ) : cfType === 'file' ? (
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFieldChange(condFieldId, file ? file.name : '');
                  }}
                  className="mt-1"
                />
              ) : cfType === 'select' ? (
                <Select
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                >
                  <option value="">{cf.placeholder || 'Select...'}</option>
                  {cfOpts.map((o) => (
                    <option key={o.value} value={o.value || o.label}>
                      {o.label || o.value}
                    </option>
                  ))}
                </Select>
              ) : cfType === 'radio' ? (
                <div className="mt-1">
                  <RadioGroup
                    name={condFieldId}
                    value={condValue as string}
                    onChange={(val) => handleFieldChange(condFieldId, val)}
                    options={cfOpts.map((o) => ({ value: o.value || o.label, label: o.label || o.value }))}
                  />
                </div>
              ) : cfType === 'checkbox' ? (
                <div className="mt-1 space-y-2">
                  {cfOpts.map((o) => {
                    const optVal = o.value || o.label;
                    const checked = Array.isArray(condValue) && condValue.includes(optVal);
                    return (
                      <label key={optVal} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = Array.isArray(condValue) ? condValue : [];
                            const newValue = e.target.checked
                              ? [...current, optVal]
                              : current.filter((v) => v !== optVal);
                            handleFieldChange(condFieldId, newValue);
                          }}
                          className="rounded border-gray-300 text-rose-600"
                        />
                        <span className="text-sm text-gray-700">{o.label || o.value}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Input
                  type="text"
                  placeholder={cf.placeholder}
                  value={condValue as string}
                  onChange={(e) => handleFieldChange(condFieldId, e.target.value)}
                  className="mt-1"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderField = (field: AddOnFormField, index: number): React.JSX.Element | null => {
    const fieldId = `field-${field.stepIndex ?? 0}-${index}`;
    const value = formData[fieldId] ?? (field.type === 'checkbox' ? [] : '');

    const renderFieldWrapper = (content: React.ReactNode): React.JSX.Element => (
      <div key={fieldId}>
        {field.header && (
          <h4 className="mb-2 text-base font-bold text-gray-800">{field.header}</h4>
        )}
        {field.description && (
          <p className="mb-3 text-sm text-gray-600">{field.description}</p>
        )}
        {content}
        {field.reminder && (
          <p className="mt-1 text-xs text-red-600 font-medium">{field.reminder}</p>
        )}
      </div>
    );

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      case 'number':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="number"
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      case 'date':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="date"
              value={value as string}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      case 'file':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFieldChange(fieldId, file ? file.name : '');
              }}
              required={field.required}
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      case 'select': {
        const selectedValue = value as string;
        const selectedOpt = (field.options ?? []).find((o) => o.value === selectedValue);
        const conditionalList = Array.isArray(selectedOpt?.conditionalFields)
          ? selectedOpt.conditionalFields
          : [];
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Select
              value={selectedValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
              required={field.required}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {selectedValue &&
              conditionalList.length > 0 &&
              renderConditionalFields(fieldId, selectedValue, conditionalList)}
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );
      }

      case 'radio': {
        const radioValue = value as string;
        const radioOpt = (field.options ?? []).find((o) => o.value === radioValue);
        const radioConditionalList = Array.isArray(radioOpt?.conditionalFields)
          ? radioOpt.conditionalFields
          : [];
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <RadioGroup
              name={fieldId}
              value={radioValue}
              onChange={(val) => handleFieldChange(fieldId, val)}
              options={field.options ?? []}
            />
            {radioValue &&
              radioConditionalList.length > 0 &&
              renderConditionalFields(fieldId, radioValue, radioConditionalList)}
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );
      }

      case 'checkbox':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <div className="space-y-2">
              {(field.options ?? []).map((opt) => {
                const checked = Array.isArray(value) && value.includes(opt.value);
                const optConditionalList = Array.isArray(opt.conditionalFields)
                  ? opt.conditionalFields
                  : [];
                return (
                  <div key={opt.value} className="space-y-1">
                    <label className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = Array.isArray(value) ? value : [];
                          const newValue = e.target.checked
                            ? [...current, opt.value]
                            : current.filter((v) => v !== opt.value);
                          handleFieldChange(fieldId, newValue);
                        }}
                        className="rounded border-gray-300 text-rose-600"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                    {checked &&
                      optConditionalList.length > 0 &&
                      renderConditionalFields(fieldId, opt.value, optConditionalList)}
                  </div>
                );
              })}
            </div>
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      case 'textarea':
        return renderFieldWrapper(
          <>
            <Label>
              {field.label}
              {field.required && <span className="text-rose-500 ml-0.5">*</span>}
            </Label>
            <Textarea
              placeholder={field.placeholder}
              rows={4}
              value={value as string}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
              required={field.required}
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="bg-white w-full min-w-0 overflow-hidden rounded-2xl border border-gray-100 shadow-sm sm:shadow-md sm:border-gray-200 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 mb-4 sm:mb-5">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500 sm:text-base">{description}</p>
            )}
          </div>
        </div>

        <StepIndicator currentStep={currentStepIndex} steps={sortedSteps} />

        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden mb-5 sm:mb-6 shadow-sm">
          <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
            {currentFields.length > 0 ? (
              currentFields.map((field, index) => renderField(field, index))
            ) : (
              <p className="text-gray-500 text-sm">No fields configured for this step.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-between">
          {getStepButtonVisibility('back') && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0 || isSubmitting}
              className="gap-2"
            >
              {getStepButtonText('back')}
            </Button>
          )}
          <div className="flex flex-wrap gap-3">
            {getStepButtonVisibility('saveAsDraft') && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraftClick}
                disabled={isSubmitting}
                className="gap-2"
                title={!canSaveDraft ? 'Fill in at least one field to save a draft' : undefined}
              >
                {getStepButtonText('saveAsDraft')}
              </Button>
            )}
            {getStepButtonVisibility('cancel') && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Handle cancel - could navigate back or reset form
                  if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
                    window.history.back();
                  }
                }}
                disabled={isSubmitting}
                className="gap-2"
              >
                {getStepButtonText('cancel')}
              </Button>
            )}
            {((getStepButtonVisibility('next') && !isLastStep) || (getStepButtonVisibility('submit') && isLastStep)) && (
              <Button
                type="button"
                onClick={goNext}
                disabled={isSubmitting}
                className="gap-2 bg-rose-600 hover:bg-rose-700"
              >
                {isSubmitting
                  ? 'Submitting...'
                  : isLastStep
                    ? getStepButtonText('submit')
                    : getStepButtonText('next')}
                {!isSubmitting && <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
