'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';

type AddOnFormField = {
  id?: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{
    value: string;
    label: string;
    conditionalFields?: Array<{ type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> }>;
  }>;
  stepIndex?: number;
  helpText?: string;
  fieldOrder?: number;
  header?: string;
  description?: string;
  reminder?: string;
};

/** Generates a unique field ID that does not conflict with existing fields. */
function generateUniqueFieldId(existingFields: AddOnFormField[]): string {
  const existingIds = new Set(existingFields.map((f) => f.id).filter(Boolean));
  let id: string;
  do {
    id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  } while (existingIds.has(id));
  return id;
}

type AddOnFormStep = {
  index: number;
  letter: string;
  label: string;
  buttonTexts?: {
    back?: string;
    next?: string;
    submit?: string;
    cancel?: string;
  };
  buttonVisibility?: {
    back?: boolean;
    next?: boolean;
    submit?: boolean;
    cancel?: boolean;
  };
};

type AddOnItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  visible?: boolean; // Controls visibility in citizen portal (defaults to false = hidden)
  formFields?: AddOnFormField[];
  formSteps?: AddOnFormStep[];
  buttonTexts?: {
    back?: string;
    next?: string;
    submit?: string;
    cancel?: string;
  };
  buttonVisibility?: {
    back?: boolean;
    next?: boolean;
    submit?: boolean;
    cancel?: boolean;
  };
};

export interface BusinessPermitCustomizationCardProps {
  addOns: AddOnItem[];
  onUpdateAddOns: (next: AddOnItem[]) => void;
  onSave?: () => Promise<void>;
  onSaveWithData?: (updatedAddOns: AddOnItem[]) => Promise<void>; // Optional: save with specific data
  editingFormId?: string | null; // ID of form being edited, null for new form
  onClose?: () => void; // Callback when form builder should close
}

const FIELD_TYPES = [
  'text',
  'number',
  'email',
  'date',
  'file',
  'select',
  'radio',
  'checkbox',
  'textarea',
] as const;

export function BusinessPermitCustomizationCard({
  addOns,
  onUpdateAddOns,
  onSave,
  onSaveWithData,
  editingFormId = null,
  onClose,
}: BusinessPermitCustomizationCardProps): React.JSX.Element {
  // If editingFormId is provided, edit that form; otherwise create new
  const isNewForm = editingFormId === null;
  const targetId = editingFormId || 'temp-new-form';
  const index = addOns.findIndex((a) => a.id === targetId);
  const addOn = index >= 0 ? addOns[index] : null;
  const [lastSavedState, setLastSavedState] = useState<string>('');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [selectedStepFilter, setSelectedStepFilter] = useState<number | null>(null);
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);
  const [dragOverStepIdx, setDragOverStepIdx] = useState<number | null>(null);
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);
  const [dragOverFieldIndex, setDragOverFieldIndex] = useState<number | null>(null);
  const lastFormIdRef = React.useRef<string | null>(null);
  const stepRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const stepFieldRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Initialize new form when modal opens for new form creation
  useEffect(() => {
    if (isNewForm && !addOn) {
      // Check if temp form already exists to avoid duplicates
      const tempFormExists = addOns.some(a => a.id === 'temp-new-form');
      if (!tempFormExists) {
        // Clean up any existing temp forms first (safety check)
        const cleanedAddOns = addOns.filter(a => a.id !== 'temp-new-form');
        
        const newAddOn: AddOnItem = {
          id: 'temp-new-form',
          title: '',
          description: '',
          icon: 'FileText',
          color: 'bg-blue-500',
          visible: false, // Default to hidden in application form list
          formFields: [],
          formSteps: [],
          buttonTexts: {
            back: 'Back',
            next: 'Next',
            submit: 'Submit Application',
          },
          buttonVisibility: {
            back: true,
            next: true,
            submit: true,
            cancel: false,
          },
        };
        onUpdateAddOns([...cleanedAddOns, newAddOn]);
      }
    }
  }, [isNewForm, editingFormId, addOn, addOns, onUpdateAddOns]);

  // Set lastSavedState and reset step filter when switching forms (baseline for change detection)
  useEffect(() => {
    const formId = addOn?.id ?? null;
    if (formId !== lastFormIdRef.current) {
      lastFormIdRef.current = formId;
      setSelectedStepFilter(null);
      setDraggedStepIdx(null);
      setDragOverStepIdx(null);
      setDraggedFieldIndex(null);
      setDragOverFieldIndex(null);
      if (addOn) {
        setLastSavedState(JSON.stringify(addOn));
      } else {
        setLastSavedState('');
      }
    }
  }, [editingFormId, addOn?.id, addOn]);

  const replaceAddOn = useCallback((patch: Partial<AddOnItem>): void => {
    if (index < 0 && !isNewForm) return;
    let next: AddOnItem[];
    if (index < 0) {
      // Creating new form
      const newAddOn: AddOnItem = {
        id: 'temp-new-form',
        title: '',
        description: '',
        icon: 'FileText',
        color: 'bg-blue-500',
        formFields: [],
        formSteps: [],
        buttonTexts: {
          back: 'Back',
          next: 'Next',
          submit: 'Submit Application',
        },
        buttonVisibility: {
          back: true,
          next: true,
          submit: true,
          cancel: false,
        },
        ...patch,
      };
      // Remove any existing temp form before adding new one
      next = [...addOns.filter(a => a.id !== 'temp-new-form'), newAddOn];
    } else {
      next = addOns.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      );
    }
    onUpdateAddOns(next);
  }, [index, isNewForm, addOns, onUpdateAddOns]);

  const hasChanges = addOn && lastSavedState ? JSON.stringify(addOn) !== lastSavedState : false;

  const handleApply = async (): Promise<void> => {
    if (!addOn) return;
    
    // 1. Validate form data
    if (!addOn.title || addOn.title.trim() === '') {
      toast.error('Form must have a title.');
      return;
    }
    if (!addOn.formSteps || !Array.isArray(addOn.formSteps) || addOn.formSteps.length === 0) {
      toast.error('Form must have at least one step.');
      return;
    }
    if (!addOn.formFields || !Array.isArray(addOn.formFields) || addOn.formFields.length === 0) {
      toast.error('Form must have at least one field.');
      return;
    }

    // 2. Generate/update form ID (for new forms)
    let finalAddOn: AddOnItem = addOn;
    if (addOn.id === 'temp-new-form' || isNewForm) {
      const slugify = (s: string): string =>
        String(s)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80) || 'form';

      let newId = slugify(addOn.title);
      let counter = 1;
      const existingIds = addOns.filter(a => a.id !== 'temp-new-form').map(a => a.id);
      while (existingIds.includes(newId)) {
        newId = `${slugify(addOn.title)}-${counter}`;
        counter++;
      }

      finalAddOn = { ...addOn, id: newId };
    }

    // 3. Build updated addOns: remove temp forms, add or update this form
    let updatedAddOns: AddOnItem[] = addOns.filter(a => a.id !== 'temp-new-form');
    if (index >= 0) {
      updatedAddOns = addOns.map((item, i) => (i === index ? finalAddOn : item)).filter(a => a.id !== 'temp-new-form');
    } else {
      updatedAddOns = [...updatedAddOns, finalAddOn];
    }

    const previousAddOns = addOns;
    onUpdateAddOns(updatedAddOns);

    const applySuccess = (): void => {
      setLastSavedState(JSON.stringify(finalAddOn));
      toast.success(isNewForm ? 'Form created successfully!' : 'Changes applied successfully!');
      if (onClose) setTimeout(onClose, 800);
    };

    const applyError = (error: unknown): void => {
      const message = error instanceof Error ? error.message : 'Failed to save changes';
      toast.error(message);
      onUpdateAddOns(previousAddOns);
    };

    // 4. Save to backend
    if (onSaveWithData) {
      try {
        await onSaveWithData(updatedAddOns);
        applySuccess();
      } catch (error) {
        console.error('Error saving form:', error);
        applyError(error);
      }
      return;
    }

    if (onSave) {
      try {
        await new Promise((r) => setTimeout(r, 200));
        await onSave();
        applySuccess();
      } catch (error) {
        console.error('Error saving form:', error);
        applyError(error);
      }
      return;
    }

    applySuccess();
  };

  const handleCancel = (): void => {
    if (isNewForm && addOn?.id === 'temp-new-form') {
      onUpdateAddOns(addOns.filter(a => a.id !== 'temp-new-form'));
      setLastSavedState('');
    } else if (addOn && lastSavedState) {
      try {
        const saved = JSON.parse(lastSavedState) as AddOnItem;
        replaceAddOn(saved);
      } catch (e) {
        console.error('Error restoring saved state:', e);
      }
    }
    toast.success('Changes cancelled');
    if (onClose) onClose();
  };


  const updateStep = (stepIndex: number, field: 'letter' | 'label', value: string): void => {
    if (!addOn) return;
    const steps = (addOn.formSteps ?? []).map((s) =>
      s.index === stepIndex ? { ...s, [field]: value } : s
    );
    if (!steps.some((s) => s.index === stepIndex)) {
      steps.push({ index: stepIndex, letter: 'A', label: 'Step', [field]: value });
      steps.sort((a, b) => a.index - b.index);
    }
    replaceAddOn({ formSteps: steps });
  };

  const updateStepButtonTexts = (stepIndex: number, buttonType: 'back' | 'next' | 'submit' | 'cancel', value: string): void => {
    if (!addOn) return;
    const steps = (addOn.formSteps ?? []).map((s) =>
      s.index === stepIndex
        ? { ...s, buttonTexts: { ...(s.buttonTexts ?? {}), [buttonType]: value } }
        : s
    );
    replaceAddOn({ formSteps: steps });
  };

  const updateStepButtonVisibility = (stepIndex: number, buttonType: 'back' | 'next' | 'submit' | 'cancel', value: boolean): void => {
    if (!addOn) return;
    const steps = (addOn.formSteps ?? []).map((s) =>
      s.index === stepIndex
        ? { ...s, buttonVisibility: { ...(s.buttonVisibility ?? {}), [buttonType]: value } }
        : s
    );
    replaceAddOn({ formSteps: steps });
  };

  const getStepButtonText = (step: AddOnFormStep, buttonType: 'back' | 'next' | 'submit' | 'cancel'): string => {
    return step.buttonTexts?.[buttonType] ?? buttonTexts[buttonType] ?? 
      (buttonType === 'back' ? 'Back' : 
       buttonType === 'next' ? 'Next' : 
       buttonType === 'submit' ? 'Submit Application' : 'Cancel');
  };

  const getStepButtonVisibility = (step: AddOnFormStep, buttonType: 'back' | 'next' | 'submit' | 'cancel'): boolean => {
    if (step.buttonVisibility?.[buttonType] !== undefined) {
      return step.buttonVisibility[buttonType] ?? false;
    }
    return buttonVisibility[buttonType] ?? 
      (buttonType === 'back' || buttonType === 'next' || buttonType === 'submit' ? true : false);
  };

  const addField = (stepIndex: number): void => {
    if (!addOn) return;
    const fields = [...(addOn.formFields ?? [])];
    const stepFields = fields.filter((f) => (f.stepIndex ?? 0) === stepIndex);
    const maxOrder = stepFields.length > 0
      ? Math.max(...stepFields.map((f) => f.fieldOrder ?? 0))
      : -1;
    const newField: AddOnFormField = {
      id: generateUniqueFieldId(fields),
      type: 'text',
      label: 'New field',
      placeholder: '',
      required: false,
      stepIndex,
      fieldOrder: maxOrder + 1,
    };
    fields.push(newField);
    replaceAddOn({ formFields: fields });
  };

  const reorderStepByDrag = (dragIdx: number, dropIdx: number): void => {
    if (!addOn) return;
    if (dragIdx === dropIdx) return;
    const steps = [...(addOn.formSteps ?? [])];
    const [moved] = steps.splice(dragIdx, 1);
    steps.splice(dropIdx, 0, moved);
    const oldToNewStepIndex = new Map<number, number>();
    steps.forEach((s, idx) => {
      oldToNewStepIndex.set(s.index, idx);
    });
    steps.forEach((s, idx) => {
      s.index = idx;
    });
    const fields = (addOn.formFields ?? []).map((f) => {
      const oldStepIdx = f.stepIndex ?? 0;
      const newStepIdx = oldToNewStepIndex.get(oldStepIdx) ?? oldStepIdx;
      return { ...f, stepIndex: newStepIdx };
    });
    replaceAddOn({ formSteps: steps, formFields: fields });
  };

  const reorderFieldByDrop = (dragFieldIndex: number, dropFieldIndex: number): void => {
    if (!addOn) return;
    if (dragFieldIndex === dropFieldIndex) return;
    const fields = [...(addOn.formFields ?? [])];
    const dragField = fields[dragFieldIndex];
    const dropField = fields[dropFieldIndex];
    if (!dragField || !dropField) return;
    const stepIndex = dragField.stepIndex ?? 0;
    if ((dropField.stepIndex ?? 0) !== stepIndex) return;
    const stepFields = fields
      .map((f, i) => ({ ...f, originalIndex: i }))
      .filter((f) => (f.stepIndex ?? 0) === stepIndex)
      .sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));
    const dragPos = stepFields.findIndex((f) => f.originalIndex === dragFieldIndex);
    const dropPos = stepFields.findIndex((f) => f.originalIndex === dropFieldIndex);
    if (dragPos < 0 || dropPos < 0) return;
    const [moved] = stepFields.splice(dragPos, 1);
    stepFields.splice(dropPos, 0, moved);
    stepFields.forEach((f, idx) => {
      const origIdx = f.originalIndex;
      if (origIdx !== undefined) {
        const { originalIndex: _omit, ...fieldWithoutOriginalIndex } = f;
        fields[origIdx] = { ...fieldWithoutOriginalIndex, fieldOrder: idx };
      }
    });
    replaceAddOn({ formFields: fields });
  };

  const updateField = (
    fieldIndex: number,
    updates: Partial<AddOnFormField>
  ): void => {
    if (!addOn) return;
    const fields = [...(addOn.formFields ?? [])];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    replaceAddOn({ formFields: fields });
  };

  const removeField = (fieldIndex: number): void => {
    if (!addOn) return;
    const fields = (addOn.formFields ?? []).filter((_, i) => i !== fieldIndex);
    replaceAddOn({ formFields: fields });
  };

  if (!addOn) {
    return (
      <div className="rounded-lg sm:rounded-xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300">
        <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/90 backdrop-blur-sm p-6 sm:p-8 lg:p-10 text-center hover:border-indigo-400 transition-all duration-200 max-w-2xl mx-auto">
            <p className="mb-6 sm:mb-8 text-sm sm:text-base lg:text-lg text-gray-700 font-medium px-2 leading-relaxed">
              {isNewForm 
                ? 'Start creating your new application form by adding a title and configuring steps and fields.'
                : 'Form not found. Please create a new form or select an existing one to edit.'}
            </p>
            {isNewForm && (
              <Button
                type="button"
                onClick={() => {
                  const newAddOn: AddOnItem = {
                    id: 'temp-new-form',
                    title: '',
                    description: '',
                    icon: 'FileText',
                    color: 'bg-blue-500',
                    formFields: [],
                    formSteps: [],
                    buttonTexts: {
                      back: 'Back',
                      next: 'Next',
                      submit: 'Submit Application',
                    },
                    buttonVisibility: {
                      back: true,
                      next: true,
                      submit: true,
                      cancel: false,
                    },
                  };
                  onUpdateAddOns([...addOns.filter(a => a.id !== 'temp-new-form'), newAddOn]);
                }}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-medium"
              >
                <Plus className="h-5 w-5 shrink-0" />
                Start Creating Form
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const steps = addOn.formSteps ?? [];
  const fields = addOn.formFields ?? [];
  const visibleSteps = selectedStepFilter !== null
    ? steps.filter((s) => s.index === selectedStepFilter)
    : steps;
  const buttonTexts = addOn.buttonTexts ?? {};
  const buttonVisibility = addOn.buttonVisibility ?? {
    back: true,
    next: true,
    submit: true,
    cancel: false,
  };

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Form Metadata */}
      <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0"></div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Form Title & Description</h3>
        </div>
        <div className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Form Title</label>
            <Input
              value={addOn.title}
              onChange={(e) => replaceAddOn({ title: e.target.value })}
              className="text-sm sm:text-base h-10 sm:h-11"
              placeholder="Enter form title..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Form Description</label>
            <Textarea
              value={addOn.description}
              onChange={(e) => replaceAddOn({ description: e.target.value })}
              className="text-sm sm:text-base min-h-[90px] sm:min-h-[100px] resize-y"
              placeholder="Enter form description..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Form Steps with Button Configuration */}
      <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0"></div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Form Steps & Button Configuration</h3>
            </div>
            <p className="ml-3.5 text-xs sm:text-sm text-gray-500 leading-relaxed">
              Configure each step and customize button labels & visibility. Drag and drop to reorder steps.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {steps.length > 0 && (
              <select
                className="h-9 sm:h-10 rounded-md border border-gray-300 bg-white px-3 text-xs sm:text-sm font-medium text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                value={selectedStepFilter === null ? 'all' : selectedStepFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') setSelectedStepFilter(null);
                  else {
                    const stepIdx = parseInt(val, 10);
                    if (!isNaN(stepIdx)) setSelectedStepFilter(stepIdx);
                  }
                }}
              >
                <option value="all">All steps</option>
                {steps.map((s) => (
                  <option key={s.index} value={s.index}>
                    Step {s.letter}: {s.label}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const maxIndex = steps.length > 0 ? Math.max(...steps.map((s) => s.index)) : -1;
                const newSteps = [...steps, { index: maxIndex + 1, letter: String.fromCharCode(65 + maxIndex + 1), label: 'New Step' }];
                replaceAddOn({ formSteps: newSteps });
              }}
              className="gap-1.5 sm:gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 w-full sm:w-auto shrink-0 h-9 sm:h-10"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Add Step</span>
            </Button>
          </div>
        </div>
        <div className="space-y-3 sm:space-y-4">
            {visibleSteps.map((step) => {
              const isExpanded = expandedSteps.has(step.index);
              const idxInFullList = steps.findIndex((s) => s.index === step.index);
              const isLastStep = idxInFullList === steps.length - 1;
              const isDragging = draggedStepIdx === idxInFullList;
              const isDragOver = dragOverStepIdx === idxInFullList;
              return (
                <div 
                  key={step.index}
                  ref={(el) => {
                    if (el) stepRefs.current.set(step.index, el);
                    else stepRefs.current.delete(step.index);
                  }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedStepIdx(idxInFullList);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', String(idxInFullList));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverStepIdx(idxInFullList);
                  }}
                  onDragLeave={() => setDragOverStepIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedStepIdx !== null && draggedStepIdx !== idxInFullList) {
                      reorderStepByDrag(draggedStepIdx, idxInFullList);
                    }
                    setDraggedStepIdx(null);
                    setDragOverStepIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggedStepIdx(null);
                    setDragOverStepIdx(null);
                  }}
                  className={`group/step rounded-lg sm:rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-grab active:cursor-grabbing ${
                    isDragging ? 'opacity-50' : ''
                  } ${isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400' : ''}`}
                >
                  {/* Step Header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-white/60">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center pt-1 shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <Input
                        value={step.letter}
                        onChange={(e) => updateStep(step.index, 'letter', e.target.value)}
                        className="w-14 sm:w-16 text-sm font-semibold text-center shrink-0 h-9 sm:h-10"
                        placeholder="A"
                      />
                      <Input
                        value={step.label}
                        onChange={(e) => updateStep(step.index, 'label', e.target.value)}
                        className="flex-1 min-w-0 text-sm sm:text-base h-9 sm:h-10"
                        placeholder="Step label"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newExpanded = new Set(expandedSteps);
                          if (isExpanded) {
                            newExpanded.delete(step.index);
                          } else {
                            newExpanded.add(step.index);
                          }
                          setExpandedSteps(newExpanded);
                        }}
                        className="gap-1.5 sm:gap-2 border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 flex-1 sm:flex-initial h-9 sm:h-10"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 transition-transform duration-200 shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">Hide Buttons</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 transition-transform duration-200 shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">Configure Buttons</span>
                          </>
                        )}
                      </Button>
                      {steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSteps = steps.filter((s) => s.index !== step.index);
                            const newFields = fields.filter((f) => (f.stepIndex ?? 0) !== step.index);
                            replaceAddOn({ formSteps: newSteps, formFields: newFields });
                          }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0 h-9 sm:h-10 w-9 sm:w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Button Configuration */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gradient-to-br from-indigo-50/30 to-white p-4 sm:p-5 lg:p-6 animate-in slide-in-from-top-2 duration-200">
                      <p className="mb-4 sm:mb-5 text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Button Labels & Visibility for this Step
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {/* Back Button */}
                        {!isLastStep && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700">Back Button</label>
                              <Switch
                                checked={getStepButtonVisibility(step, 'back')}
                                onCheckedChange={(checked) => updateStepButtonVisibility(step.index, 'back', checked)}
                              />
                            </div>
                            <Input
                              value={getStepButtonText(step, 'back')}
                              onChange={(e) => updateStepButtonTexts(step.index, 'back', e.target.value)}
                              className="text-sm sm:text-base h-9 sm:h-10"
                              placeholder="Back"
                              disabled={!getStepButtonVisibility(step, 'back')}
                            />
                          </div>
                        )}

                        {/* Next Button */}
                        {!isLastStep && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700">Next Button</label>
                              <Switch
                                checked={getStepButtonVisibility(step, 'next')}
                                onCheckedChange={(checked) => updateStepButtonVisibility(step.index, 'next', checked)}
                              />
                            </div>
                            <Input
                              value={getStepButtonText(step, 'next')}
                              onChange={(e) => updateStepButtonTexts(step.index, 'next', e.target.value)}
                              className="text-sm sm:text-base h-9 sm:h-10"
                              placeholder="Next"
                              disabled={!getStepButtonVisibility(step, 'next')}
                            />
                          </div>
                        )}

                        {/* Submit Button */}
                        {isLastStep && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs sm:text-sm font-medium text-gray-700">Submit Button</label>
                              <Switch
                                checked={getStepButtonVisibility(step, 'submit')}
                                onCheckedChange={(checked) => updateStepButtonVisibility(step.index, 'submit', checked)}
                              />
                            </div>
                            <Input
                              value={getStepButtonText(step, 'submit')}
                              onChange={(e) => updateStepButtonTexts(step.index, 'submit', e.target.value)}
                              className="text-sm sm:text-base h-9 sm:h-10"
                              placeholder="Submit Application"
                              disabled={!getStepButtonVisibility(step, 'submit')}
                            />
                          </div>
                        )}

                        {/* Cancel Button */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700">Cancel Button</label>
                            <Switch
                              checked={getStepButtonVisibility(step, 'cancel')}
                              onCheckedChange={(checked) => updateStepButtonVisibility(step.index, 'cancel', checked)}
                            />
                          </div>
                          <Input
                            value={getStepButtonText(step, 'cancel')}
                            onChange={(e) => updateStepButtonTexts(step.index, 'cancel', e.target.value)}
                            className="text-sm sm:text-base h-9 sm:h-10"
                            placeholder="Cancel"
                            disabled={!getStepButtonVisibility(step, 'cancel')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* Form Fields Section */}
      <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0"></div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Form Fields</h3>
            </div>
            <p className="ml-3.5 text-xs sm:text-sm text-gray-500 leading-relaxed">
              Add and configure fields for each step. Use the dropdown to show only the selected step or all steps. Drag and drop to reorder steps and fields.
            </p>
          </div>
          {steps.length > 0 && (
            <select
              className="h-9 sm:h-10 rounded-md border border-gray-300 bg-white px-3 text-xs sm:text-sm font-medium text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 w-full sm:w-auto shrink-0"
              value={selectedStepFilter === null ? 'all' : selectedStepFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  setSelectedStepFilter(null);
                } else {
                  const stepIdx = parseInt(val, 10);
                  if (!isNaN(stepIdx)) setSelectedStepFilter(stepIdx);
                }
              }}
            >
              <option value="all">All steps</option>
              {steps.map((s) => (
                <option key={s.index} value={s.index}>
                  Step {s.letter}: {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {steps.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Add steps first, then add fields to each step.
              </p>
            ) : (
              visibleSteps.map((step) => {
                const stepFields = fields
                  .map((f, idx) => ({ ...f, originalIndex: idx }))
                  .filter((f) => (f.stepIndex ?? 0) === step.index)
                  .sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));
                return (
                  <div 
                    key={step.index}
                    ref={(el) => {
                      if (el) stepFieldRefs.current.set(step.index, el);
                      else stepFieldRefs.current.delete(step.index);
                    }}
                    className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 transition-all duration-200"
                  >
                    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 break-words flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                          {step.letter}
                        </span>
                        <span>{step.label}</span>
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addField(step.index)}
                        className="gap-1.5 sm:gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 w-full sm:w-auto shrink-0 h-9 sm:h-10"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">Add Field</span>
                      </Button>
                    </div>
                    {stepFields.length === 0 ? (
                      <div className="py-8 sm:py-10 text-center rounded-lg border-2 border-dashed border-gray-300 bg-white/50">
                        <p className="text-sm sm:text-base text-gray-600 mb-1.5 font-medium">
                          No fields in this step yet.
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Click &quot;Add Field&quot; above to add fields to this step.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {stepFields.map((field) => {
                          const fieldIndex = field.originalIndex;
                          if (fieldIndex === undefined) return null;
                          const isFieldDragging = draggedFieldIndex === fieldIndex;
                          const isFieldDragOver = dragOverFieldIndex === fieldIndex;
                          return (
                            <div
                              key={field.id ?? fieldIndex}
                              draggable
                              onDragStart={(e) => {
                                setDraggedFieldIndex(fieldIndex);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/html', String(fieldIndex));
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                const draggedField = draggedFieldIndex !== null ? fields[draggedFieldIndex] : null;
                                if (draggedField && (draggedField.stepIndex ?? 0) === step.index) {
                                  setDragOverFieldIndex(fieldIndex);
                                }
                              }}
                              onDragLeave={() => setDragOverFieldIndex(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedFieldIndex !== null && draggedFieldIndex !== fieldIndex) {
                                  reorderFieldByDrop(draggedFieldIndex, fieldIndex);
                                }
                                setDraggedFieldIndex(null);
                                setDragOverFieldIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedFieldIndex(null);
                                setDragOverFieldIndex(null);
                              }}
                              className={`group/field rounded-lg sm:rounded-xl border border-gray-200 bg-white p-4 sm:p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                isFieldDragging ? 'opacity-50' : ''
                              } ${isFieldDragOver ? 'ring-2 ring-indigo-500 ring-offset-2 border-indigo-400' : ''}`}
                            >
                              <div className="mb-2 flex items-start gap-2">
                                <div className="flex items-center pt-1 shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  {/* Header (Optional) */}
                                  <div>
                                    <label className="mb-1 block text-xs text-gray-600">
                                      Header <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <Input
                                      value={field.header ?? ''}
                                      onChange={(e) =>
                                        updateField(fieldIndex, { header: e.target.value })
                                      }
                                      className="text-sm"
                                      placeholder="Optional header/label above field"
                                    />
                                  </div>

                                  {/* Description (Optional) */}
                                  <div>
                                    <label className="mb-1 block text-xs text-gray-600">
                                      Description <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <Textarea
                                      value={field.description ?? ''}
                                      onChange={(e) =>
                                        updateField(fieldIndex, { description: e.target.value })
                                      }
                                      className="text-sm min-h-[120px] resize-y"
                                      placeholder="Optional long description text shown below the header"
                                      rows={5}
                                    />
                                  </div>

                                  {/* Type and Label */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="mb-1 block text-xs text-gray-600">Type</label>
                                      <select
                                        className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                                        value={field.type}
                                        onChange={(e) => updateField(fieldIndex, { type: e.target.value })}
                                      >
                                        {FIELD_TYPES.map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs text-gray-600">Label</label>
                                      <Input
                                        value={field.label}
                                        onChange={(e) => updateField(fieldIndex, { label: e.target.value })}
                                        className="text-sm"
                                        placeholder="Field label"
                                      />
                                    </div>
                                  </div>

                                  {/* Placeholder and Help Text */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="mb-1 block text-xs text-gray-600">Placeholder</label>
                                      <Input
                                        value={field.placeholder ?? ''}
                                        onChange={(e) =>
                                          updateField(fieldIndex, { placeholder: e.target.value })
                                        }
                                        className="text-sm"
                                        placeholder="Placeholder text"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs text-gray-600">Help Text</label>
                                      <Input
                                        value={field.helpText ?? ''}
                                        onChange={(e) =>
                                          updateField(fieldIndex, { helpText: e.target.value })
                                        }
                                        className="text-sm"
                                        placeholder="Optional help text"
                                      />
                                    </div>
                                  </div>

                                  {/* Reminder (Optional) */}
                                  <div>
                                    <label className="mb-1 block text-xs text-gray-600">
                                      Reminder <span className="text-gray-400">(Optional)</span>
                                    </label>
                                    <Input
                                      value={field.reminder ?? ''}
                                      onChange={(e) =>
                                        updateField(fieldIndex, { reminder: e.target.value })
                                      }
                                      className="text-sm"
                                      placeholder="Optional reminder text (shown in red)"
                                    />
                                  </div>

                                  {/* Required */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={field.required ?? false}
                                        onChange={(e) =>
                                          updateField(fieldIndex, { required: e.target.checked })
                                        }
                                        className="rounded border-gray-300"
                                      />
                                      <label className="text-xs text-gray-600">Required</label>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeField(fieldIndex)}
                                      className="text-rose-600 hover:text-rose-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {(field.type === 'select' ||
                                    field.type === 'radio' ||
                                    field.type === 'checkbox') && (
                                    <div className="space-y-3">
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <label className="block text-xs font-medium text-gray-700">
                                          Options
                                        </label>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const currentOptions = field.options ?? [];
                                            const newOption = {
                                              value: '',
                                              label: '',
                                            };
                                            updateField(fieldIndex, {
                                              options: [...currentOptions, newOption],
                                            });
                                          }}
                                          className="gap-1 h-7 text-xs w-full sm:w-auto"
                                        >
                                          <Plus className="h-3 w-3 shrink-0" />
                                          Add Option
                                        </Button>
                                      </div>
                                      {field.options && field.options.length > 0 ? (
                                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2 sm:p-3">
                                          {field.options.map((option, optIndex) => (
                                            <div
                                              key={optIndex}
                                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md bg-white p-2 sm:p-3 border border-gray-200"
                                            >
                                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                  <label className="mb-0.5 block text-xs text-gray-500">
                                                    Value <span className="text-gray-400">(optional - auto-generated)</span>
                                                  </label>
                                                  <Input
                                                    value={option.value}
                                                    onChange={(e) => {
                                                      const newOptions = [...(field.options ?? [])];
                                                      newOptions[optIndex] = {
                                                        ...newOptions[optIndex],
                                                        value: e.target.value,
                                                      };
                                                      updateField(fieldIndex, {
                                                        options: newOptions,
                                                      });
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="e.g., yes, no, or leave empty"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="mb-0.5 block text-xs text-gray-500">
                                                    Label (what users see)
                                                  </label>
                                                  <Input
                                                    value={option.label}
                                                    onChange={(e) => {
                                                      const newOptions = [...(field.options ?? [])];
                                                      const newLabel = e.target.value;
                                                      // Auto-generate value from label if value is empty or matches old label
                                                      const currentValue = newOptions[optIndex].value;
                                                      const oldLabel = newOptions[optIndex].label;
                                                      // If value is empty or was auto-generated from old label, regenerate from new label
                                                      const wasAutoGenerated = currentValue === '' || 
                                                        currentValue === oldLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                                      const autoValue = wasAutoGenerated && newLabel.trim() !== ''
                                                        ? newLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                                        : currentValue;
                                                      newOptions[optIndex] = {
                                                        ...newOptions[optIndex],
                                                        value: autoValue,
                                                        label: newLabel,
                                                      };
                                                      updateField(fieldIndex, {
                                                        options: newOptions,
                                                      });
                                                    }}
                                                    className="h-8 text-xs"
                                                    placeholder="Display Label"
                                                  />
                                                </div>
                                              </div>
                                              {/* Conditional fields (optional): show when this option is selected */}
                                              <div className="sm:col-span-2 mt-2 pt-2 border-t border-gray-100 space-y-2">
                                                <p className="text-xs font-medium text-gray-600">
                                                  Conditional fields <span className="text-gray-400 font-normal">(optional)</span>
                                                </p>
                                                {(() => {
                                                  const opt = option as {
                                                    conditionalFields?: Array<{ type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> }>;
                                                    conditionalField?: { type: string; label: string; placeholder?: string; options?: Array<{ value: string; label: string }> };
                                                  };
                                                  const list = Array.isArray(opt.conditionalFields)
                                                    ? opt.conditionalFields
                                                    : opt.conditionalField
                                                      ? [opt.conditionalField]
                                                      : [];
                                                  return (
                                                    <>
                                                      {list.length > 0 && (
                                                        <div className="space-y-2">
                                                          {list.map((cf, cfIndex) => {
                                                            const cfHasOptions = cf.type === 'select' || cf.type === 'radio' || cf.type === 'checkbox';
                                                            const cfOpts = Array.isArray(cf.options) ? cf.options : [];
                                                            return (
                                                            <div key={cfIndex} className="space-y-2">
                                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md bg-gray-50/80 p-2 items-end">
                                                                <div>
                                                                  <label className="mb-0.5 block text-xs text-gray-500">Type</label>
                                                                  <select
                                                                    className="h-8 w-full rounded-md border bg-white px-2 text-xs"
                                                                    value={cf.type || 'text'}
                                                                    onChange={(e) => {
                                                                      const newOptions = [...(field.options ?? [])];
                                                                      const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                      arr[cfIndex] = { ...arr[cfIndex], type: e.target.value };
                                                                      newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                      updateField(fieldIndex, { options: newOptions });
                                                                    }}
                                                                  >
                                                                    {FIELD_TYPES.filter((t) => !['submit', 'reset'].includes(t)).map((t) => (
                                                                      <option key={t} value={t}>{t}</option>
                                                                    ))}
                                                                  </select>
                                                                </div>
                                                                <div>
                                                                  <label className="mb-0.5 block text-xs text-gray-500">Label</label>
                                                                  <Input
                                                                    value={cf.label ?? ''}
                                                                    onChange={(e) => {
                                                                      const newOptions = [...(field.options ?? [])];
                                                                      const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                      arr[cfIndex] = { ...arr[cfIndex], label: e.target.value };
                                                                      newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                      updateField(fieldIndex, { options: newOptions });
                                                                    }}
                                                                    className="h-8 text-xs"
                                                                    placeholder="e.g. First name"
                                                                  />
                                                                </div>
                                                                <div className="flex items-end gap-1">
                                                                  <div className="flex-1">
                                                                    <label className="mb-0.5 block text-xs text-gray-500">Placeholder</label>
                                                                    <Input
                                                                      value={cf.placeholder ?? ''}
                                                                      onChange={(e) => {
                                                                        const newOptions = [...(field.options ?? [])];
                                                                        const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                        arr[cfIndex] = { ...arr[cfIndex], placeholder: e.target.value };
                                                                        newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                        updateField(fieldIndex, { options: newOptions });
                                                                      }}
                                                                      className="h-8 text-xs"
                                                                      placeholder="Optional"
                                                                    />
                                                                  </div>
                                                                  <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 shrink-0"
                                                                    onClick={() => {
                                                                      const newOptions = [...(field.options ?? [])];
                                                                      const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                      arr.splice(cfIndex, 1);
                                                                      newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr.length ? arr : undefined };
                                                                      updateField(fieldIndex, { options: newOptions });
                                                                    }}
                                                                  >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                              {cfHasOptions && (
                                                                <div className="rounded-md bg-gray-50/60 p-2 pl-3 border-l-2 border-gray-200 space-y-2">
                                                                  <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-medium text-gray-600">Options for {cf.type}</span>
                                                                    <Button
                                                                      type="button"
                                                                      variant="outline"
                                                                      size="sm"
                                                                      className="h-6 text-xs gap-0.5"
                                                                      onClick={() => {
                                                                        const newOptions = [...(field.options ?? [])];
                                                                        const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                        const opts = Array.isArray(arr[cfIndex]?.options) ? [...(arr[cfIndex].options ?? [])] : [];
                                                                        opts.push({ value: '', label: '' });
                                                                        arr[cfIndex] = { ...arr[cfIndex], options: opts };
                                                                        newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                        updateField(fieldIndex, { options: newOptions });
                                                                      }}
                                                                    >
                                                                      <Plus className="h-3 w-3" />
                                                                      Add
                                                                    </Button>
                                                                  </div>
                                                                  {cfOpts.length > 0 ? (
                                                                    <div className="space-y-1">
                                                                      {cfOpts.map((cfOpt: { value: string; label: string }, cfOptIdx: number) => (
                                                                        <div key={cfOptIdx} className="flex gap-1 items-center">
                                                                          <Input
                                                                            value={cfOpt.value}
                                                                            onChange={(e) => {
                                                                              const newOptions = [...(field.options ?? [])];
                                                                              const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                              const opts = [...cfOpts];
                                                                              opts[cfOptIdx] = { ...opts[cfOptIdx], value: e.target.value };
                                                                              arr[cfIndex] = { ...arr[cfIndex], options: opts };
                                                                              newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                              updateField(fieldIndex, { options: newOptions });
                                                                            }}
                                                                            className="h-7 text-xs flex-1"
                                                                            placeholder="Value"
                                                                          />
                                                                          <Input
                                                                            value={cfOpt.label}
                                                                            onChange={(e) => {
                                                                              const newOptions = [...(field.options ?? [])];
                                                                              const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                              const opts = [...cfOpts];
                                                                              opts[cfOptIdx] = { ...opts[cfOptIdx], label: e.target.value };
                                                                              arr[cfIndex] = { ...arr[cfIndex], options: opts };
                                                                              newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                              updateField(fieldIndex, { options: newOptions });
                                                                            }}
                                                                            className="h-7 text-xs flex-1"
                                                                            placeholder="Label"
                                                                          />
                                                                          <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 w-7 p-0 text-rose-600 shrink-0"
                                                                            onClick={() => {
                                                                              const newOptions = [...(field.options ?? [])];
                                                                              const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                                              const opts = cfOpts.filter((_: { value: string; label: string }, i: number) => i !== cfOptIdx);
                                                                              arr[cfIndex] = { ...arr[cfIndex], options: opts.length ? opts : undefined };
                                                                              newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                                              updateField(fieldIndex, { options: newOptions });
                                                                            }}
                                                                          >
                                                                            <Trash2 className="h-3 w-3" />
                                                                          </Button>
                                                                        </div>
                                                                      ))}
                                                                    </div>
                                                                  ) : (
                                                                    <p className="text-xs text-gray-500">Add options for users to choose from.</p>
                                                                  )}
                                                                </div>
                                                              )}
                                                            </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1"
                                                        onClick={() => {
                                                          const newOptions = [...(field.options ?? [])];
                                                          const arr = Array.isArray(newOptions[optIndex].conditionalFields) ? [...newOptions[optIndex].conditionalFields] : [];
                                                          arr.push({ type: 'text', label: '', placeholder: '' });
                                                          newOptions[optIndex] = { ...newOptions[optIndex], conditionalFields: arr };
                                                          updateField(fieldIndex, { options: newOptions });
                                                        }}
                                                      >
                                                        <Plus className="h-3 w-3" />
                                                        Add conditional field
                                                      </Button>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  const newOptions = (field.options ?? []).filter(
                                                    (_, i) => i !== optIndex
                                                  );
                                                  updateField(fieldIndex, {
                                                    options: newOptions,
                                                  });
                                                }}
                                                className="h-8 w-full sm:w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0 justify-center"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 sm:p-4 text-center">
                                          <p className="text-xs text-gray-500">
                                            No options added yet. Click &quot;Add Option&quot; to create options for this field.
                                          </p>
                                        </div>
                                      )}
                                      <p className="text-xs text-gray-500 leading-relaxed">
                                        <strong>Tip:</strong> Value is used internally (e.g., &quot;yes&quot;), Label is what users see (e.g., &quot;Yes&quot;). If you leave value empty, it will be auto-generated from the label.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {fields.length === 0 && steps.length > 0 && (
            <div className="py-12 text-center rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Plus className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                No fields added yet
              </p>
              <p className="text-xs text-gray-500">
                Select a step above and click &quot;Add Field&quot; to get started.
              </p>
            </div>
          )}
        </div>

      {/* Action area: unsaved indicator scrolls; only buttons stick */}
      <div className="mt-6 pt-4 sm:pt-5 border-t border-gray-200">
        {hasChanges && (
          <div className="flex items-center justify-center sm:justify-end gap-2 px-3 sm:px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 mb-3 w-fit sm:ml-auto">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"></div>
            <p className="text-xs sm:text-sm font-medium text-amber-700 whitespace-nowrap">
              Unsaved changes
            </p>
          </div>
        )}
        <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row-reverse flex-wrap gap-2.5 sm:gap-3 w-full sm:w-auto sm:ml-auto py-2 -mx-1 px-1 bg-white/95 backdrop-blur-sm rounded-lg">
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={isNewForm ? (!addOn?.title?.trim() || (addOn?.formSteps?.length ?? 0) < 1) : !hasChanges}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center h-10 sm:h-11 font-medium"
          >
            {isNewForm ? 'Create' : 'Apply Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 w-full sm:w-auto justify-center h-10 sm:h-11"
          >
            <span className="text-sm font-medium">Cancel</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
