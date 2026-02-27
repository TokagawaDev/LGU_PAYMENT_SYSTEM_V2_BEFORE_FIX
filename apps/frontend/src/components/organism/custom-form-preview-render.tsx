'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';

function getFieldId(prefix: string, i: number): string {
  return `${prefix}-field-${i}`;
}

export interface CustomFormPreviewRenderProps {
  title: string;
  description: string;
  formFields: UserCustomFormField[];
  fieldIdPrefix?: string;
}

/**
 * Renders a read-only preview of custom form fields (text, number, select, radio, checkbox, etc.).
 */
export function CustomFormPreviewRender({
  title: _title,
  description: _description,
  formFields,
  fieldIdPrefix = 'preview',
}: CustomFormPreviewRenderProps): React.JSX.Element {
  const inputFields = formFields.filter(
    (f) => f.type !== 'submit' && f.type !== 'reset'
  );
  const hasSubmit = formFields.some((f) => f.type === 'submit');
  const hasReset = formFields.some((f) => f.type === 'reset');

  return (
    <div className="space-y-5">
      {inputFields.map((field, i) => {
        const key = getFieldId(fieldIdPrefix, i);
        const label = (
          <label
            htmlFor={key}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {field.label}
            {field.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        );
        switch (field.type) {
          case 'text':
          case 'email':
          case 'password':
            return (
              <div key={key}>
                {label}
                <Input
                  id={key}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            );
          case 'number':
            return (
              <div key={key}>
                {label}
                <Input
                  id={key}
                  type="number"
                  placeholder={field.placeholder}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            );
          case 'date':
            return (
              <div key={key}>
                {label}
                <Input
                  id={key}
                  type="date"
                  disabled
                  className="bg-gray-50"
                />
              </div>
            );
          case 'file':
            return (
              <div key={key}>
                {label}
                <Input id={key} type="file" disabled className="bg-gray-50" />
              </div>
            );
          case 'select':
            return (
              <div key={key}>
                {label}
                <Select disabled className="bg-gray-50">
                  <option value="">{field.placeholder || 'Select...'}</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            );
          case 'radio':
            return (
              <fieldset key={key}>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(field.options ?? []).map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={key}
                        value={opt.value}
                        disabled
                        className="text-rose-600"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          case 'checkbox':
            return (
              <fieldset key={key}>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </legend>
                {((field.options?.length ?? 0) > 0 ? (field.options ?? []) : [{ value: 'on', label: field.label }]).map(
                  (opt) => (
                    <label key={opt.value} className="flex items-center gap-2 py-1">
                      <input type="checkbox" value={opt.value} disabled className="text-rose-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  )
                )}
              </fieldset>
            );
          case 'textarea':
            return (
              <div key={key}>
                {label}
                <Textarea
                  id={key}
                  placeholder={field.placeholder}
                  rows={4}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            );
          default:
            return null;
        }
      })}
      <div className="flex gap-3 pt-2">
        {hasReset && <Button type="button" variant="outline" disabled>Reset</Button>}
        {hasSubmit && <Button type="button" disabled>Submit</Button>}
      </div>
    </div>
  );
}
