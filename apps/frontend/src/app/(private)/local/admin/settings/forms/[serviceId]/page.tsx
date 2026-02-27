'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/components/molecules/admin-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/select';
import { SERVICE_NAME_BY_ID, ServiceId } from '@shared/constants/services';
import { ROUTES } from '@/constants/routes';
import toast from 'react-hot-toast';
import { ArrowLeft, GripVertical, Trash2 } from 'lucide-react';
import { getServiceConfig } from '@/constants/payment-services';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type Field = {
  id: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'select'
    | 'textarea'
    | 'file'
    | 'date'
    | 'cost';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
};

type FormConfig = {
  title: string;
  description: string;
  formFields: Field[];
  baseAmount: number;
  processingFee: number;
};

export default function ServiceFormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string as ServiceId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<FormConfig>({
    title: SERVICE_NAME_BY_ID[serviceId] || 'Service',
    description: 'Custom form for this service',
    formFields: [],
    baseAmount: 0,
    processingFee: 0,
  });
  const isDirtyRef = useRef(false);
  const [optionsDraft, setOptionsDraft] = useState<Record<string, string>>({});

  const slugifyValue = (input: string): string => {
    return (input || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const parseOptionsString = (
    raw: string
  ): Array<{ value: string; label: string }> => {
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
        const value = slugifyValue(segment);
        return value && label ? { value, label } : null;
      })
      .filter((o): o is { value: string; label: string } => Boolean(o));
  };

  const serviceName = useMemo(
    () => SERVICE_NAME_BY_ID[serviceId] || serviceId,
    [serviceId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/settings/form-config/${serviceId}`
        );
        let applied: Partial<FormConfig> = {};
        if (res.ok) {
          applied = (await res.json()) as Partial<FormConfig>;
        }

        // Fallback to predefined defaults when no backend config exists
        const defaults = getServiceConfig(serviceId);
        const hasBackendFields =
          Array.isArray(applied.formFields) && applied.formFields.length > 0;

        setConfig((prev) => ({
          ...prev,
          ...(defaults
            ? {
                title: defaults.title,
                description: defaults.description,
                formFields: defaults.formFields,
                baseAmount: defaults.baseAmount,
                processingFee: defaults.processingFee,
              }
            : {}),
          ...(hasBackendFields ||
          typeof applied.baseAmount === 'number' ||
          typeof applied.processingFee === 'number'
            ? {
                title: applied.title || (defaults?.title ?? prev.title),
                description:
                  applied.description ||
                  (defaults?.description ?? prev.description),
                formFields: hasBackendFields
                  ? (applied.formFields as Field[])
                  : defaults?.formFields ?? [],
                baseAmount:
                  typeof applied.baseAmount === 'number'
                    ? applied.baseAmount
                    : defaults?.baseAmount ?? prev.baseAmount,
                processingFee:
                  typeof applied.processingFee === 'number'
                    ? applied.processingFee
                    : defaults?.processingFee ?? prev.processingFee,
              }
            : {}),
        }));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  const addField = (type: Field['type']) => {
    if (type === 'cost') {
      const hasCost = config.formFields.some((f) => f.type === 'cost');
      if (hasCost) {
        toast.error('Only one cost field is allowed.');
        return;
      }
    }
    const idBase = `${type}_field_${config.formFields.length + 1}`;
    const id = idBase;
    isDirtyRef.current = true;
    setConfig({
      ...config,
      formFields: [
        ...config.formFields,
        { id, label: `New ${type} field`, type, required: false },
      ],
    });
    if (type === 'select') {
      setOptionsDraft((prev) => ({ ...prev, [id]: '' }));
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const sanitizeText = (value?: string, maxLen = 200): string => {
        const input = String(value ?? '');
        let out = '';
        for (let i = 0; i < input.length && out.length < maxLen; i++) {
          const code = input.charCodeAt(i);
          if (code < 32 || code === 127) continue;
          const ch = input[i];
          if (ch === '<' || ch === '>') continue;
          out += ch;
        }
        return out.trim();
      };

      const slugifyId = (input: string): string => {
        return (
          (input || '')
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'field'
        );
      };

      const allowedTypes: Field['type'][] = [
        'text',
        'email',
        'tel',
        'number',
        'select',
        'textarea',
        'file',
        'date',
        'cost',
      ];

      // Apply any uncommitted select options drafts and sanitize/validate
      const draftApplied = {
        ...config,
        formFields: config.formFields.map((field) => {
          if (
            field.type === 'select' &&
            Object.prototype.hasOwnProperty.call(optionsDraft, field.id)
          ) {
            const parsed = parseOptionsString(optionsDraft[field.id] ?? '');
            return { ...field, options: parsed };
          }
          return field;
        }),
      } satisfies FormConfig;

      const costCount = draftApplied.formFields.filter(
        (f) => f.type === 'cost'
      ).length;
      if (costCount > 1) {
        toast.error('Only one cost field is allowed.');
        throw new Error('validation');
      }

      const normalizedFields = draftApplied.formFields.map((f, index) => {
        if (!allowedTypes.includes(f.type)) {
          throw new Error(`Invalid field type at index ${index}`);
        }
        const label = sanitizeText(f.label, 120);
        if (!label) {
          throw new Error(`Label is required for field #${index + 1}`);
        }
        const id = slugifyId(sanitizeText(f.id || label, 120));
        const placeholder = sanitizeText(f.placeholder, 200);
        if (f.type === 'select') {
          const seen = new Set<string>();
          const options = (f.options ?? []).reduce<
            Array<{ value: string; label: string }>
          >((acc, opt) => {
            const optLabel = sanitizeText(opt?.label ?? opt?.value ?? '', 80);
            const value = slugifyId(sanitizeText(opt?.value ?? optLabel, 80));
            if (!optLabel || !value || seen.has(value)) return acc;
            seen.add(value);
            acc.push({ value, label: optLabel });
            return acc;
          }, []);
          if (options.length === 0) {
            throw new Error(
              `Select field #${index + 1} must have at least one option`
            );
          }
          return { ...f, id, label, placeholder, options };
        }
        return { ...f, id, label, placeholder };
      });

      const hasCost = costCount === 1;
      const normalizedPayload = {
        title: sanitizeText(draftApplied.title, 120) || 'Service',
        description: sanitizeText(draftApplied.description, 400),
        formFields: normalizedFields,
        baseAmount: hasCost
          ? 0
          : Math.max(0, Number(draftApplied.baseAmount) || 0),
        processingFee: Math.max(0, Number(draftApplied.processingFee) || 0),
      } as FormConfig;

      const res = await fetch(
        `${API_BASE_URL}/settings/form-config/${serviceId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalizedPayload),
        }
      );
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved');
      isDirtyRef.current = false;
    } catch (e) {
      if (e instanceof Error && e.message === 'validation') {
        // Already surfaced via toast above
      } else {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBackWithConfirm = () => {
    if (
      isDirtyRef.current &&
      !confirm('You have unsaved changes. Discard them and go back?')
    ) {
      return;
    }
    router.push(ROUTES.ADMIN.SETTINGS);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title={`Customize: ${serviceName}`}
        backHref={ROUTES.ADMIN.SETTINGS}
        onBack={handleBackWithConfirm}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBackWithConfirm}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="button" onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input value={config.title} disabled readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={config.description}
                onChange={(e) =>
                  setConfig({ ...config, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Base Amount
              </label>
              <Input
                type="number"
                value={config.baseAmount}
                disabled={config.formFields.some((f) => f.type === 'cost')}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    baseAmount: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Processing Fee
              </label>
              <Input
                type="number"
                value={config.processingFee}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    processingFee: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'text',
                  'email',
                  'tel',
                  'number',
                  'select',
                  'textarea',
                  'file',
                  'date',
                  'cost',
                ] as Field['type'][]
              ).map((t) => {
                const isCost = t === 'cost';
                const hasCost = config.formFields.some(
                  (f) => f.type === 'cost'
                );
                const disabled = isCost && hasCost;
                return (
                  <Button
                    key={t}
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => addField(t)}
                    title={
                      disabled ? 'Only one cost field is allowed' : undefined
                    }
                  >
                    {t}
                  </Button>
                );
              })}
            </div>

            <div className="space-y-3">
              {config.formFields.map((f, idx) => (
                <div
                  key={f.id}
                  className="border rounded flex transition-transform duration-150 ease-in-out hover:shadow-sm hover:-translate-y-0.5"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = Number(
                      e.dataTransfer.getData('text/plain')
                    );
                    const toIndex = idx;
                    if (Number.isNaN(fromIndex) || fromIndex === toIndex)
                      return;
                    const updated = [...config.formFields];
                    const [moved] = updated.splice(fromIndex, 1);
                    updated.splice(toIndex, 0, moved);
                    setConfig({ ...config, formFields: updated });
                    isDirtyRef.current = true;
                  }}
                >
                  <div
                    className="flex items-center p-2 bg-gray-50 rounded-l cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(idx));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  >
                    <GripVertical className="h-5 w-5 text-gray-500" />
                  </div>

                  <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex justify-between items-center pt-2">
                      <div className="flex items-center gap-6">
                        <div className="text-sm font-medium">
                          Type: <span className="font-normal">{f.type}</span>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(f.required)}
                            onChange={(e) => {
                              const formFields = [...config.formFields];
                              formFields[idx] = {
                                ...formFields[idx],
                                required: e.target.checked,
                              };
                              setConfig({ ...config, formFields });
                              isDirtyRef.current = true;
                            }}
                          />
                          Required
                        </label>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          const formFields = config.formFields.filter(
                            (_, i) => i !== idx
                          );
                          setConfig({ ...config, formFields });
                          isDirtyRef.current = true;
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    {/* Label Input */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium mb-1">
                        Label
                      </label>
                      <Input
                        value={f.label}
                        onChange={(e) => {
                          const formFields = [...config.formFields];
                          formFields[idx] = {
                            ...formFields[idx],
                            label: e.target.value,
                          };
                          setConfig({ ...config, formFields });
                          isDirtyRef.current = true;
                        }}
                      />
                    </div>

                    {/* Placeholder Input (only for text-like types) */}
                    {(f.type === 'text' ||
                      f.type === 'email' ||
                      f.type === 'tel' ||
                      f.type === 'number' ||
                      f.type === 'textarea') && (
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium mb-1">
                          Placeholder
                        </label>
                        <Input
                          value={f.placeholder || ''}
                          onChange={(e) => {
                            const formFields = [...config.formFields];
                            formFields[idx] = {
                              ...formFields[idx],
                              placeholder: e.target.value,
                            };
                            setConfig({ ...config, formFields });
                            isDirtyRef.current = true;
                          }}
                        />
                      </div>
                    )}

                    {/* Options Input (Full Width) */}
                    {f.type === 'select' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium mb-1">
                          Options (comma separated)
                        </label>
                        <Input
                          value={
                            optionsDraft[f.id] ??
                            (f.options || [])
                              .map((o) => o.label || o.value)
                              .join(', ')
                          }
                          placeholder="Value 1, Value 2"
                          onChange={(e) => {
                            const raw = e.target.value;
                            setOptionsDraft((prev) => ({
                              ...prev,
                              [f.id]: raw,
                            }));
                          }}
                          onBlur={() => {
                            const raw = optionsDraft[f.id] ?? '';
                            const options = parseOptionsString(raw);
                            const formFields = [...config.formFields];
                            formFields[idx] = { ...formFields[idx], options };
                            setConfig({ ...config, formFields });
                            isDirtyRef.current = true;
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
