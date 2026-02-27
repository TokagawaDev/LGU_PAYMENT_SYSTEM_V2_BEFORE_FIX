'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ServiceId } from '@shared/constants/services';
import { getServiceConfig, FormFieldConfig } from '@/constants/payment-services';
import { getPaymentServiceFormConfig, savePaymentServiceFormConfig, PaymentServiceFormConfig } from '@/lib/api/admin';

const FIELD_TYPES = [
  'text',
  'email',
  'tel',
  'number',
  'select',
  'textarea',
  'file',
  'date',
  'cost',
] as const;

export interface PaymentServiceCustomizationCardProps {
  serviceId: ServiceId;
  onClose?: () => void;
}

export function PaymentServiceCustomizationCard({
  serviceId,
  onClose,
}: PaymentServiceCustomizationCardProps): React.JSX.Element {
  const defaultConfig = getServiceConfig(serviceId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PaymentServiceFormConfig>({
    title: defaultConfig?.title || '',
    description: defaultConfig?.description || '',
    formFields: defaultConfig?.formFields || [],
    baseAmount: defaultConfig?.baseAmount || 0,
    processingFee: defaultConfig?.processingFee || 0,
  });
  const [optionsDraft, setOptionsDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const savedConfig = await getPaymentServiceFormConfig(serviceId);
        if (savedConfig) {
          setConfig({
            title: savedConfig.title || '',
            description: savedConfig.description || '',
            formFields: savedConfig.formFields || [],
            baseAmount: savedConfig.baseAmount ?? 0,
            processingFee: savedConfig.processingFee ?? 0,
          });
          // Initialize options draft for select fields
          const draft: Record<string, string> = {};
          (savedConfig.formFields || []).forEach((field) => {
            if (field.type === 'select' && field.options) {
              draft[field.id] = field.options.map((o) => o.label || o.value).join(', ');
            }
          });
          setOptionsDraft(draft);
        } else if (defaultConfig) {
          setConfig({
            title: defaultConfig.title || '',
            description: defaultConfig.description || '',
            formFields: defaultConfig.formFields || [],
            baseAmount: defaultConfig.baseAmount ?? 0,
            processingFee: defaultConfig.processingFee ?? 0,
          });
        } else {
          // Ensure we always have a valid config even if no defaults exist
          setConfig({
            title: '',
            description: '',
            formFields: [],
            baseAmount: 0,
            processingFee: 0,
          });
        }
      } catch (error) {
        toast.error('Failed to load form configuration');
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, [serviceId, defaultConfig]);

  const parseOptionsString = (raw: string): Array<{ value: string; label: string }> => {
    return (raw || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((segment) => {
        if (segment.includes(':')) {
          const [value, label] = segment.split(':');
          const v = (value || '').trim();
          const l = (label || '').trim();
          return v && l ? { value: v, label: l } : null;
        }
        const label = segment;
        const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return value && label ? { value, label } : null;
      })
      .filter((o): o is { value: string; label: string } => Boolean(o));
  };

  const addField = (type: typeof FIELD_TYPES[number]) => {
    const formFields = config.formFields || [];
    if (type === 'cost') {
      const hasCost = formFields.some((f) => f.type === 'cost');
      if (hasCost) {
        toast.error('Only one cost field is allowed');
        return;
      }
    }
    const id = `${type}_field_${formFields.length + 1}`;
    const newField: FormFieldConfig = {
      id,
      label: `New ${type} field`,
      type: type as FormFieldConfig['type'],
      required: false,
    };
    if (type === 'select') {
      setOptionsDraft((prev) => ({ ...prev, [id]: '' }));
    }
    setConfig({
      ...config,
      formFields: [...formFields, newField],
    });
  };

  const updateField = (index: number, updates: Partial<FormFieldConfig>) => {
    const formFields = config.formFields || [];
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...updates };
    setConfig({ ...config, formFields: updated });
  };

  const removeField = (index: number) => {
    const formFields = config.formFields || [];
    const field = formFields[index];
    if (field && field.type === 'select') {
      const newDraft = { ...optionsDraft };
      delete newDraft[field.id];
      setOptionsDraft(newDraft);
    }
    setConfig({
      ...config,
      formFields: formFields.filter((_, i) => i !== index),
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const formFields = config.formFields || [];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formFields.length) return;
    const updated = [...formFields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setConfig({ ...config, formFields: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formFields = config.formFields || [];
      const costCount = formFields.filter((f) => f.type === 'cost').length;
      if (costCount > 1) {
        toast.error('Only one cost field is allowed');
        return;
      }

      const sanitizedFields = formFields.map((field) => {
        const fieldId = (field.id || '').trim();
        const fieldLabel = (field.label || '').trim();
        
        if (!fieldId) {
          throw new Error(`Field ID is required for field: ${fieldLabel || 'unnamed field'}`);
        }
        if (!fieldLabel) {
          throw new Error(`Field label is required for field ID: ${fieldId}`);
        }
        
        const sanitized: PaymentServiceFormConfig['formFields'][number] = {
          id: fieldId,
          label: fieldLabel,
          type: field.type,
          required: Boolean(field.required),
        };
        if (field.placeholder) sanitized.placeholder = (field.placeholder || '').trim();
        if (field.type === 'select') {
          const raw = optionsDraft[field.id] || '';
          const options = parseOptionsString(raw);
          if (options.length === 0) {
            throw new Error(`Select field "${fieldLabel}" must have at least one option`);
          }
          sanitized.options = options;
        }
        if (field.validation) {
          sanitized.validation = field.validation;
        }
        return sanitized;
      });

      const hasCost = costCount === 1;
      const title = (config.title || '').trim();
      const description = (config.description || '').trim();
      
      if (!title) {
        toast.error('Service title is required');
        return;
      }
      
      const payload: PaymentServiceFormConfig = {
        title,
        description,
        formFields: sanitizedFields,
        baseAmount: hasCost ? 0 : Math.max(0, config.baseAmount || 0),
        processingFee: Math.max(0, config.processingFee || 0),
      };

      await savePaymentServiceFormConfig(serviceId, payload);
      toast.success('Form configuration saved successfully');
      if (onClose) onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Title</label>
            <Input
              value={config.title || ''}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="Service title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
            <Input
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              placeholder="Service description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Base Amount
            </label>
            <Input
              type="number"
              value={config.baseAmount ?? ''}
              disabled={(config.formFields || []).some((f) => f.type === 'cost')}
              onChange={(e) =>
                setConfig({
                  ...config,
                  baseAmount: Number(e.target.value) || 0,
                })
              }
            />
            {(config.formFields || []).some((f) => f.type === 'cost') && (
              <p className="text-xs text-gray-500 mt-1">
                Base amount disabled when cost field is present
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Processing Fee
            </label>
            <Input
              type="number"
              value={config.processingFee ?? ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  processingFee: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add and configure form fields for this payment service
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map((type) => {
              const isCost = type === 'cost';
              const hasCost = (config.formFields || []).some((f) => f.type === 'cost');
              const disabled = isCost && hasCost;
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => addField(type)}
                  title={disabled ? 'Only one cost field is allowed' : undefined}
                >
                  {type}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {(config.formFields || []).length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm text-gray-500">No fields yet. Add fields using the buttons above.</p>
            </div>
          ) : (
            (config.formFields || []).map((field, index) => (
              <div
                key={field.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === (config.formFields || []).length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Type: {field.type}</span>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(field.required)}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                          />
                          Required
                        </label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Label</label>
                        <Input
                          value={field.label || ''}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                        />
                      </div>
                      {(field.type === 'text' ||
                        field.type === 'email' ||
                        field.type === 'tel' ||
                        field.type === 'number' ||
                        field.type === 'textarea') && (
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">Placeholder</label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Placeholder text"
                          />
                        </div>
                      )}
                      {field.type === 'select' && (
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            Options (comma separated, use "value:label" format)
                          </label>
                          <Input
                            value={optionsDraft[field.id] ?? (field.options || []).map((o) => o.label || o.value).join(', ')}
                            placeholder="Option 1, Option 2, value1:Label 1"
                            onChange={(e) => {
                              setOptionsDraft((prev) => ({ ...prev, [field.id]: e.target.value }));
                            }}
                            onBlur={() => {
                              const raw = optionsDraft[field.id] ?? '';
                              const options = parseOptionsString(raw);
                              updateField(index, { options });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
