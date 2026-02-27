'use client';

import { ChevronRight } from 'lucide-react';
import { FormStep, FORM_STEPS } from '@/constants/payment-services';

interface BreadcrumbProps {
  currentStep: FormStep;
  completedSteps: FormStep[];
  onStepClick?: (step: FormStep) => void;
}

/**
 * Breadcrumb component for multi-step forms
 * Shows the current progress through form > review > payment > receipt flow
 */
export function Breadcrumb({
  currentStep,
  completedSteps,
  onStepClick,
}: BreadcrumbProps): React.JSX.Element {
  const getStepStatus = (
    stepId: FormStep
  ): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(stepId)) {
      return 'completed';
    }
    if (stepId === currentStep) {
      return 'current';
    }
    return 'upcoming';
  };

  const getStepStyles = (
    status: 'completed' | 'current' | 'upcoming'
  ): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white';
      case 'upcoming':
        return 'bg-gray-200 text-gray-500';
      default:
        return 'bg-gray-200 text-gray-500';
    }
  };

  const getTextStyles = (
    status: 'completed' | 'current' | 'upcoming'
  ): string => {
    switch (status) {
      case 'completed':
        return 'text-green-700 font-medium';
      case 'current':
        return 'text-blue-700 font-semibold';
      case 'upcoming':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleStepClick = (step: FormStep): void => {
    const status = getStepStatus(step);
    if (onStepClick && (status === 'completed' || status === 'current')) {
      onStepClick(step);
    }
  };

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-stretch w-full">
        {FORM_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = status === 'completed' || status === 'current';

          return (
            <li
              key={step.id}
              className="relative flex-1 flex flex-col items-center justify-between pr-4 md:pr-6"
            >
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base font-medium transition-all duration-200
                    ${getStepStyles(status)}
                    ${
                      isClickable
                        ? 'cursor-pointer hover:scale-105'
                        : 'cursor-not-allowed'
                    }
                  `}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs md:text-sm ${getTextStyles(status)}`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>

              {/* Separator */}
              {index < FORM_STEPS.length - 1 && (
                <ChevronRight
                  className="w-4 h-4 md:w-5 md:h-5 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
