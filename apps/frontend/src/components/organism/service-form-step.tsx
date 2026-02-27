'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/select';
import {
  PaymentServiceConfig,
  FormFieldConfig,
} from '@/constants/payment-services';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface FormData {
  [key: string]: string;
}

interface ServiceFormStepProps {
  serviceConfig: PaymentServiceConfig;
  formData: FormData;
  isLoading: boolean;
  onInputChange: (fieldId: string, value: string) => void;
  onFileSelect?: (field: FormFieldConfig, file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBackToDashboard: () => void;
}

/**
 * Service Form Step Component
 * Handles the form input step where users fill out service-specific information
 */
export function ServiceFormStep({
  serviceConfig,
  formData,
  isLoading,
  onInputChange,
  onFileSelect,
  onSubmit,
  onBackToDashboard,
}: ServiceFormStepProps): React.JSX.Element {
  const [uploadingByField] = useState<Record<string, boolean>>({});

  const ALLOWED_MIME_TYPES: readonly string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as const;
  const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(',');

  const handleFilePick = (field: FormFieldConfig, file: File | null): void => {
    if (!file) {
      onFileSelect?.(field, null);
      onInputChange(field.id, '');
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Unsupported file type');
      onFileSelect?.(field, null);
      onInputChange(field.id, '');
      return;
    }
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      toast.error('File exceeds 10MB limit');
      onFileSelect?.(field, null);
      onInputChange(field.id, '');
      return;
    }
    onFileSelect?.(field, file);
    onInputChange(field.id, `pending:${file.name}`);
  };

  const renderFormField = (field: FormFieldConfig): React.JSX.Element => {
    const value = formData[field.id] || '';

    if (field.type === 'select') {
      const hasOptions = field.options && field.options.length > 0;
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <select
            id={field.id}
            value={value}
            onChange={(e) => {
              onInputChange(field.id, e.target.value);
            }}
            required={field.required}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {hasOptions ? (
              field.options!.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No options available
              </option>
            )}
          </select>
          {field.reminder && (
            <p className="text-xs text-red-500 mt-1">{field.reminder}</p>
          )}
          {!hasOptions && (
            <p className="text-xs text-amber-600 mt-1">
              Please add options for this select field in the admin panel
            </p>
          )}
        </div>
      );
    }

    if (field.type === 'radio') {
      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(field.options || []).map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer py-1"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onInputChange(field.id, e.target.value)}
                  className="h-4 w-4 rounded-full border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                  required={field.required}
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {field.reminder && (
            <p className="text-xs text-red-500 mt-1">{field.reminder}</p>
          )}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      // For checkbox, value can be an array or comma-separated string
      const currentValues = Array.isArray(value) 
        ? value 
        : typeof value === 'string' && value 
        ? value.split(',').filter(Boolean)
        : [];
      
      return (
        <div key={field.id} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {(field.options || []).map((option) => {
              const isChecked = currentValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer py-1"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v) => v !== option.value);
                      // Store as comma-separated string for consistency
                      onInputChange(field.id, newValues.join(','));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              );
            })}
          </div>
          {field.reminder && (
            <p className="text-xs text-red-500 mt-1">{field.reminder}</p>
          )}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => onInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
          />
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <Input
            id={field.id}
            type="date"
            value={value}
            onChange={(e) => onInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        </div>
      );
    }

    if (field.type === 'cost') {
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(e) => onInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={0.01}
            step="0.01"
          />
        </div>
      );
    }

    if (field.type === 'file') {
      const uploading = Boolean(uploadingByField[field.id]);
      const hasFile = typeof value === 'string' && value.length > 0;
      return (
        <div key={field.id} className="space-y-2">
          <label
            htmlFor={field.id}
            className="block text-sm font-medium text-gray-700"
          >
            {field.label}{' '}
            {field.required && <span className="text-red-500">*</span>}
          </label>
          <Input
            id={field.id}
            type="file"
            accept={FILE_INPUT_ACCEPT}
            onChange={(e) => handleFilePick(field, e.target.files?.[0] || null)}
            disabled={uploading}
            required={field.required && !hasFile}
          />
          {uploading && <p className="text-xs text-blue-600">Preparing...</p>}
          {hasFile && <p className="text-xs text-gray-600">File selected</p>}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <label
          htmlFor={field.id}
          className="block text-sm font-medium text-gray-700"
        >
          {field.label}{' '}
          {field.required && <span className="text-red-500">*</span>}
        </label>
        <Input
          id={field.id}
          type={field.type}
          value={value}
          onChange={(e) => onInputChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
        {field.reminder && (
          <p className="text-xs text-red-500 mt-1">{field.reminder}</p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {serviceConfig.title}
        </CardTitle>
        <p className="text-gray-600">{serviceConfig.description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {serviceConfig.formFields.map(renderFormField)}

          <div className="flex justify-between pt-6">
            <Button type="button" variant="outline" onClick={onBackToDashboard}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue to Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
