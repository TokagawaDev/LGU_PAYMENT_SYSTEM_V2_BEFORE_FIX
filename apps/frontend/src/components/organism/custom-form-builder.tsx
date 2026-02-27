'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';
import { Plus, GripVertical, Trash2, Eye } from 'lucide-react';
import { CustomFormPreviewDialog } from './custom-form-preview-dialog';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File upload' },
  { value: 'select', label: 'Select (dropdown)' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'submit', label: 'Submit button' },
  { value: 'reset', label: 'Reset button' },
] as const;

export interface CustomFormBuilderProps {
  title: string;
  description: string;
  formFields: UserCustomFormField[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onFormFieldsChange: (fields: UserCustomFormField[]) => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving?: boolean;
  isNew?: boolean;
}

export function CustomFormBuilder({
  title,
  description,
  formFields,
  onTitleChange,
  onDescriptionChange,
  onFormFieldsChange,
  onPreview,
  onSaveDraft,
  onPublish,
  isSaving = false,
  isNew: _isNew = true,
}: CustomFormBuilderProps): React.JSX.Element {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
    onPreview();
  };

  const updateField = (index: number, updates: Partial<UserCustomFormField>) => {
    const next = formFields.map((f, i) =>
      i === index ? { ...f, ...updates } : f
    );
    onFormFieldsChange(next);
  };

  const addField = () => {
    onFormFieldsChange([
      ...formFields,
      {
        type: 'text',
        label: 'New field',
        placeholder: '',
        required: false,
        options: [],
      },
    ]);
  };

  const removeField = (index: number) => {
    onFormFieldsChange(formFields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    const field = formFields[fieldIndex];
    const options = [...(field.options ?? []), { value: '', label: '' }];
    updateField(fieldIndex, { options });
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    key: 'value' | 'label',
    value: string
  ) => {
    const field = formFields[fieldIndex];
    const options = [...(field.options ?? [])];
    options[optionIndex] = { ...options[optionIndex], [key]: value };
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = formFields[fieldIndex];
    const options = (field.options ?? []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Form details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Application Form"
              className="max-w-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description of the form"
              rows={2}
              className="flex w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Form fields
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" />
            Add field
          </Button>
        </div>
        <div className="space-y-4">
          {formFields.map((field, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-400 mt-2" aria-hidden>
                  <GripVertical className="h-4 w-4" />
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, { type: e.target.value })
                      }
                      className="w-full rounded-md border border-input bg-white h-9 px-2 text-sm"
                    >
                      {FIELD_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Label
                    </label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      placeholder="Field label"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {field.type !== 'submit' && field.type !== 'reset' && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`req-${index}`}
                      checked={field.required ?? false}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor={`req-${index}`}
                      className="text-xs text-gray-600"
                    >
                      Required
                    </label>
                  </div>
                  {['text', 'number', 'email', 'password', 'date', 'textarea'].includes(
                    field.type
                  ) && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Placeholder
                      </label>
                      <Input
                        value={field.placeholder ?? ''}
                        onChange={(e) =>
                          updateField(index, {
                            placeholder: e.target.value,
                          })
                        }
                        placeholder="Placeholder text"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {['select', 'radio', 'checkbox'].includes(field.type) && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Options (value / label)
                      </label>
                      <div className="space-y-2">
                        {(field.options ?? []).map((opt, oi) => (
                          <div
                            key={oi}
                            className="flex gap-2 items-center"
                          >
                            <Input
                              value={opt.value}
                              onChange={(e) =>
                                updateOption(index, oi, 'value', e.target.value)
                              }
                              placeholder="Value"
                              className="h-8 text-sm flex-1"
                            />
                            <Input
                              value={opt.label}
                              onChange={(e) =>
                                updateOption(index, oi, 'label', e.target.value)
                              }
                              placeholder="Label"
                              className="h-8 text-sm flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500"
                              onClick={() => removeOption(index, oi)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => addOption(index)}
                        >
                          + Add option
                        </Button>
                      </div>
                    </div>
                  )}
                  {['text', 'number', 'email', 'textarea'].includes(
                    field.type
                  ) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Min length / value
                        </label>
                        <Input
                          type="number"
                          value={
                            field.validation?.min ?? ''
                          }
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                min: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="Min"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Max length / value
                        </label>
                        <Input
                          type="number"
                          value={field.validation?.max ?? ''}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                max: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="Max"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Pattern (regex)
                        </label>
                        <Input
                          value={field.validation?.pattern ?? ''}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                pattern: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder="e.g. ^[A-Za-z]+$"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Custom error message
                        </label>
                        <Input
                          value={field.validation?.message ?? ''}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                message: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder="Shown when validation fails"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreviewClick}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save as draft'}
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={isSaving}
          className="bg-rose-600 hover:bg-rose-700"
        >
          {isSaving ? 'Saving...' : 'Publish'}
        </Button>
      </div>

      <CustomFormPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title={title}
        description={description}
        formFields={formFields}
      />
    </div>
  );
}
