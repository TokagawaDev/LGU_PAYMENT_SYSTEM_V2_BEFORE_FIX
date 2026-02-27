'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CustomFormPreviewRender } from './custom-form-preview-render';
import type { UserCustomFormField } from '@/hooks/use-user-custom-forms';

export interface CustomFormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formFields: UserCustomFormField[];
}

/**
 * Dialog component for previewing custom forms.
 * Displays a modal popup with the form preview.
 */
export function CustomFormPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  formFields,
}: CustomFormPreviewDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] !grid-rows-[auto_1fr] grid">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">
              Preview
            </p>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 sm:text-2xl">
            {title || 'Form Preview'}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 pr-2 -mr-2">
          <CustomFormPreviewRender
            title={title}
            description={description}
            formFields={formFields}
            fieldIdPrefix="dialog-preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
