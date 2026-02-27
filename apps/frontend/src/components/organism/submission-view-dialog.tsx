'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AddOnSubmissionItem } from '@/hooks/use-add-on-submissions';
import type { AddOnService, AddOnFormField } from '@/hooks/use-add-on-services';
import { FileDown, FileText, FileType, Download, Copy, Check, User, FileCode, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FormDisplayRow = {
  stepLabel?: string;
  label: string;
  value: string;
  fieldType?: string;
  isFile?: boolean;
};

/**
 * Build ordered list of label/value rows from submission formData and add-on form config.
 * Matches field IDs used in dynamic form: field-{stepIndex}-{indexInStep}.
 * Includes all regular fields and conditional fields in the correct order.
 */
export function buildFormDisplayRows(
  submission: AddOnSubmissionItem,
  addOn: AddOnService | undefined
): FormDisplayRow[] {
  const formData = submission.formData ?? {};
  const formFields = addOn?.formFields ?? [];
  const formSteps = addOn?.formSteps ?? [];

  const stepsOrder = formSteps
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((s) => s.index);
  const stepLabelByIndex: Record<number, string> = {};
  formSteps.forEach((s) => {
    stepLabelByIndex[s.index] = `${s.letter}. ${s.label}`;
  });

  const byStep: Record<number, AddOnFormField[]> = {};
  formFields.forEach((f) => {
    const step = f.stepIndex ?? 0;
    if (!byStep[step]) byStep[step] = [];
    byStep[step].push(f);
  });
  Object.keys(byStep).forEach((k) => {
    const step = parseInt(k, 10);
    byStep[step].sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));
  });

  const rows: FormDisplayRow[] = [];
  const stepIndices = stepsOrder.length ? stepsOrder : [...new Set(formFields.map((f) => f.stepIndex ?? 0))].sort((a, b) => a - b);

  // Track which field keys we've already processed (to avoid duplicate "Field field-X-Y" rows)
  const processedConditionalFields = new Set<string>();
  const processedRegularFieldIds = new Set<string>();

  // First, process all regular fields
  stepIndices.forEach((stepIndex) => {
    const fields = byStep[stepIndex] ?? [];
    const stepLabel = stepLabelByIndex[stepIndex];
    fields.forEach((field, i) => {
      const fieldId = `field-${stepIndex}-${i}`;
      processedRegularFieldIds.add(fieldId);
      const raw = formData[fieldId];
      let value: string;
      const isFile = field.type === 'file';
      if (raw === undefined || raw === null) {
        value = '—';
      } else if (Array.isArray(raw)) {
        value = raw.length ? raw.join(', ') : '—';
      } else {
        value = String(raw).trim() || '—';
      }
      
      // Add the regular field
      rows.push({
        stepLabel: i === 0 ? stepLabel : undefined,
        label: field.label,
        value,
        fieldType: field.type,
        isFile,
      });

      // Check if this field has conditional fields that should be displayed
      // Look for conditional fields in formData that belong to this parent field
      if (field.options && field.options.length > 0 && (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox')) {
        // Check each option for conditional fields
        field.options.forEach((option) => {
          const optValue = option.value;
          const condFields = option.conditionalFields;
          
          if (condFields && condFields.length > 0) {
            // Check if the parent field's value matches this option (meaning conditional fields should be shown)
            const parentValue = raw;
            const shouldShowConditionalFields = 
              (Array.isArray(parentValue) && parentValue.includes(optValue)) ||
              (!Array.isArray(parentValue) && String(parentValue) === String(optValue));

            if (shouldShowConditionalFields) {
              // Process each conditional field
              condFields.forEach((condField, cfIndex) => {
                const condFieldId = `${fieldId}-cond-${optValue}-${cfIndex}`;
                processedConditionalFields.add(condFieldId);
                
                const condRaw = formData[condFieldId];
                let condValue: string;
                const condIsFile = condField.type === 'file';
                
                if (condRaw === undefined || condRaw === null) {
                  condValue = '—';
                } else if (Array.isArray(condRaw)) {
                  condValue = condRaw.length ? condRaw.join(', ') : '—';
                } else {
                  condValue = String(condRaw).trim() || '—';
                }

                // Add conditional field right after its parent field
                rows.push({
                  label: condField.label || `Conditional: ${condFieldId}`,
                  value: condValue,
                  fieldType: condField.type,
                  isFile: condIsFile,
                });
              });
            }
          }
        });
      }
    });
  });

  // Process any remaining conditional fields that weren't matched above (fallback)
  // This handles edge cases where conditional fields exist in formData but weren't matched
  Object.entries(formData).forEach(([key, val]) => {
    // Skip if already processed
    if (processedConditionalFields.has(key)) return;
    
    const v = val === null || val === undefined ? '—' : Array.isArray(val) ? val.join(', ') : String(val);
    
    // Check if this is a conditional field (format: field-{step}-{index}-cond-{optValue}-{cfIndex})
    const condMatch = key.match(/^field-(\d+)-(\d+)-cond-(.+)-(\d+)$/);
    if (condMatch) {
      const [, stepIdx, fieldIdx, optValue, cfIdx] = condMatch;
      const step = parseInt(stepIdx, 10);
      const fieldIndex = parseInt(fieldIdx, 10);
      const fields = byStep[step];
      
      if (fields && fields[fieldIndex]) {
        const field = fields[fieldIndex];
        const option = field.options?.[parseInt(optValue, 10)] || field.options?.find((o) => o.value === optValue);
        const condFields = option?.conditionalFields;
        
        if (condFields && condFields[parseInt(cfIdx, 10)]) {
          const condField = condFields[parseInt(cfIdx, 10)];
          rows.push({
            label: condField.label || key,
            value: v,
            fieldType: condField.type,
            isFile: condField.type === 'file',
          });
          processedConditionalFields.add(key);
          return;
        }
      }
      // If conditional field exists in formData but we can't match it to the form config,
      // still display it with a generic label
      rows.push({
        label: `Conditional Field (${key})`,
        value: v,
        fieldType: undefined,
        isFile: false,
      });
      processedConditionalFields.add(key);
      return;
    }
    
    // Regular field pattern: only add if we did NOT already process it (e.g. form config missing for this key)
    const regularFieldMatch = key.match(/^field-(\d+)-(\d+)$/);
    if (regularFieldMatch) {
      if (!processedRegularFieldIds.has(key)) {
        rows.push({
          label: `Field ${key}`,
          value: v,
          fieldType: undefined,
          isFile: false,
        });
      }
      return;
    }

    // Only add truly unknown keys (not field-X-Y or conditional)
    if (!key.match(/^field-\d+-\d+/) && !key.match(/^field-\d+-\d+-cond-/)) {
      rows.push({ label: key, value: v });
    }
  });

  return rows;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

async function downloadTxt(rows: FormDisplayRow[], title: string, submission: AddOnSubmissionItem): Promise<void> {
  const lines: string[] = [title, '', `Status: ${submission.status}`, `Updated: ${formatDate(submission.updatedAt ?? submission.createdAt)}`, ''];
  rows.forEach((r) => {
    if (r.stepLabel) lines.push(r.stepLabel, '');
    lines.push(`${r.label}: ${r.value}`);
  });
  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}-${submission.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadDoc(rows: FormDisplayRow[], title: string, submission: AddOnSubmissionItem): Promise<void> {
  const rowsHtml = rows
    .map((r) => {
      const step = r.stepLabel ? `<tr><td colspan="2" style="padding:6px 0 2px;font-weight:600;color:#374151;">${escapeHtml(r.stepLabel)}</td></tr>` : '';
      return step + `<tr><td style="padding:4px 8px 4px 0;vertical-align:top;font-weight:500;">${escapeHtml(r.label)}</td><td style="padding:4px 0;">${escapeHtml(r.value)}</td></tr>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Segoe UI,Helvetica,Arial,sans-serif;padding:24px;max-width:640px;">` +
    `<h1 style="font-size:1.5rem;">${escapeHtml(title)}</h1>` +
    `<p style="color:#6b7280;margin-bottom:16px;">Status: ${submission.status} &nbsp;|&nbsp; Updated: ${formatDate(submission.updatedAt ?? submission.createdAt)}</p>` +
    `<table style="width:100%;border-collapse:collapse;">${rowsHtml}</table></body></html>`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-')}-${submission.id}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function downloadPdf(rows: FormDisplayRow[], title: string, submission: AddOnSubmissionItem): Promise<void> {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxW = pageWidth - margin * 2;
  let y = margin;
  const lineHeight = 14;
  const titleFontSize = 14;
  const bodyFontSize = 10;

  doc.setFontSize(titleFontSize);
  doc.text(title, margin, y);
  y += lineHeight * 1.5;
  doc.setFontSize(9);
  doc.text(`Status: ${submission.status}  |  Updated: ${formatDate(submission.updatedAt ?? submission.createdAt)}`, margin, y);
  y += lineHeight * 1.2;
  doc.setFontSize(bodyFontSize);

  const wrap = (text: string): string[] => {
    return doc.splitTextToSize(text, maxW);
  };

  rows.forEach((r) => {
    if (r.stepLabel) {
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(r.stepLabel, margin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
    }
    const labelLine = `${r.label}:`;
    const valueLines = wrap(r.value);
    if (y + (valueLines.length + 1) * lineHeight > 280) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(labelLine, margin, y);
    y += lineHeight;
    valueLines.forEach((line) => {
      doc.text(line, margin + 8, y);
      y += lineHeight;
    });
    y += 4;
  });

  doc.save(`${title.replace(/\s+/g, '-')}-${submission.id}.pdf`);
}

interface SubmissionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: AddOnSubmissionItem | null;
  addOn: AddOnService | undefined;
}

/**
 * Dialog that shows a submission's form data in read-only and offers PDF/DOC/TXT download.
 * Accessible only when open is true (caller controls via auth-protected Status page).
 */
export function SubmissionViewDialog({
  open,
  onOpenChange,
  submission,
  addOn,
}: SubmissionViewDialogProps): React.JSX.Element {
  const rows = React.useMemo(
    () => (submission && addOn ? buildFormDisplayRows(submission, addOn) : []),
    [submission, addOn]
  );
  const title =
    addOn?.title ??
    (submission as { customApplicationServiceTitle?: string | null } | undefined)?.customApplicationServiceTitle ??
    submission?.addOnId ??
    'Application';
  const [downloading, setDownloading] = React.useState<'pdf' | 'doc' | 'txt' | null>(null);
  const [copiedId, setCopiedId] = React.useState<'application' | 'user' | null>(null);
  
  // Ensure we have the application ID (fallback to _id if id is not available)
  const applicationId = React.useMemo(() => {
    if (!submission) return 'N/A';
    return submission.id || (submission as { _id?: string })?._id || String((submission as any)?._id) || 'N/A';
  }, [submission]);
  
  const userId = React.useMemo(() => {
    if (!submission) return 'N/A';
    return submission.userId || String((submission as any)?.userId) || 'N/A';
  }, [submission]);

  const handleCopyId = async (id: string, type: 'application' | 'user'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(type);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async (format: 'pdf' | 'doc' | 'txt'): Promise<void> => {
    if (!submission) return;
    setDownloading(format);
    try {
      if (format === 'txt') await downloadTxt(rows, title, submission);
      else if (format === 'doc') await downloadDoc(rows, title, submission);
      else await downloadPdf(rows, title, submission);
    } finally {
      setDownloading(null);
    }
  };

  const downloadDisabled = !submission || rows.length === 0 || downloading !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0',
          'border-0 bg-white shadow-2xl'
        )}
        aria-describedby="submission-form-content"
      >
        {/* Header: title + meta */}
        <DialogHeader className="shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-6 sm:px-8 sm:py-7">
          <DialogTitle className="text-left text-xl font-bold text-white sm:text-2xl pr-8 leading-tight">
            {title}
          </DialogTitle>
          {submission && (
            <div className="mt-4 space-y-3">
              {/* Status and Date Row */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={submission.status === 'submitted' ? 'default' : 'secondary'}
                    className={cn(
                      'font-semibold text-xs px-2.5 py-1',
                      submission.status === 'submitted'
                        ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                    )}
                  >
                    {submission.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {formatDate(submission.updatedAt ?? submission.createdAt)}
                  </span>
                </div>
              </div>

              {/* IDs Section */}
              <div className="pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-white/10 rounded-md">
                    <FileCode className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 mb-1">Application ID</p>
                    <div className="flex items-center gap-2">
                      <code 
                        className="px-2.5 py-1.5 text-xs font-mono bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white break-all min-w-0 flex-1"
                        title={`Unique Application ID: ${applicationId}`}
                      >
                        {applicationId}
                      </code>
                      {applicationId !== 'N/A' && (
                        <button
                          type="button"
                          onClick={() => handleCopyId(applicationId, 'application')}
                          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors shrink-0"
                          title="Copy Application ID"
                          aria-label="Copy Application ID"
                        >
                          {copiedId === 'application' ? (
                            <Check className="h-4 w-4 text-green-300" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 bg-white/10 rounded-md">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 mb-1">User ID</p>
                    <div className="flex items-center gap-2">
                      <code 
                        className="px-2.5 py-1.5 text-xs font-mono bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white break-all min-w-0 flex-1"
                        title={`Unique User ID: ${userId}`}
                      >
                        {userId}
                      </code>
                      {userId !== 'N/A' && (
                        <button
                          type="button"
                          onClick={() => handleCopyId(userId, 'user')}
                          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors shrink-0"
                          title="Copy User ID"
                          aria-label="Copy User ID"
                        >
                          {copiedId === 'user' ? (
                            <Check className="h-4 w-4 text-green-300" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Scrollable form content */}
        <div
          id="submission-form-content"
          className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30 px-6 py-6 sm:px-8 sm:py-8"
          role="document"
        >
          {submission && (
            <>
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No form data to display</p>
                  <p className="text-xs text-gray-400 mt-1">This application doesn't have any submitted data yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.reduce<React.ReactNode[]>((acc, row, idx) => {
                    // Step header
                    if (row.stepLabel) {
                      acc.push(
                        <div
                          key={`step-${idx}`}
                          className="flex items-center gap-3 pt-2 pb-1"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent flex-1" />
                            <div className="px-4 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-full border border-indigo-200/50">
                              <h3 className="text-sm font-bold text-indigo-700 tracking-wide">
                                {row.stepLabel}
                              </h3>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent flex-1" />
                          </div>
                        </div>
                      );
                    }
                    
                    // Field row
                    const isConditional = row.label.includes('Conditional') || row.label.startsWith('Conditional Field');
                    acc.push(
                      <div
                        key={idx}
                        className={cn(
                          'group relative rounded-xl border transition-all duration-200',
                          'bg-white hover:shadow-md',
                          isConditional
                            ? 'border-l-4 border-l-purple-400 border-t border-r border-b border-gray-200 ml-4 bg-purple-50/30'
                            : 'border-gray-200 shadow-sm'
                        )}
                      >
                        <div className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-xs font-semibold mb-2',
                                isConditional 
                                  ? 'text-purple-700 uppercase tracking-wide' 
                                  : 'text-gray-600 uppercase tracking-wide'
                              )}>
                                {row.label}
                              </p>
                              {row.isFile && row.value !== '—' ? (
                                <div className="mt-2">
                                  <a
                                    href={row.value}
                                    download={row.value.split('/').pop() || row.value}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors group/link"
                                    onClick={(e) => {
                                      // If it's just a filename (not a URL), create a blob download
                                      if (!row.value.startsWith('http://') && !row.value.startsWith('https://') && !row.value.startsWith('/')) {
                                        e.preventDefault();
                                        // Create a simple text file with the filename as content
                                        // In a real app, you'd fetch the actual file from the server
                                        const blob = new Blob([`File: ${row.value}`], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = row.value;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4 group-hover/link:scale-110 transition-transform" />
                                    <span className="break-words">{row.value}</span>
                                  </a>
                                </div>
                              ) : (
                                <p className={cn(
                                  'text-sm leading-relaxed break-words',
                                  row.value === '—' 
                                    ? 'text-gray-400 italic' 
                                    : 'text-gray-900'
                                )}>
                                  {row.value}
                                </p>
                              )}
                            </div>
                            {isConditional && (
                              <div className="shrink-0">
                                <div className="w-2 h-2 rounded-full bg-purple-400" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    return acc;
                  }, [])}
                </div>
              )}
            </>
          )}
        </div>

        {/* Download section: fixed at bottom */}
        <DialogFooter className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 sm:px-8 sm:py-5">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Download className="h-4 w-4 text-gray-400" />
              <span className="font-medium">Export Application</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload('txt')}
                disabled={downloadDisabled}
                className="gap-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium"
                aria-label="Download as plain text (TXT)"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>TXT</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload('doc')}
                disabled={downloadDisabled}
                className="gap-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium"
                aria-label="Download as Word document (DOC)"
              >
                <FileType className="h-4 w-4 shrink-0" />
                <span>DOC</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf')}
                disabled={downloadDisabled}
                className="gap-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 text-indigo-700 font-medium"
                aria-label="Download as PDF"
              >
                <FileDown className="h-4 w-4 shrink-0" />
                <span>{downloading === 'pdf' ? 'Generating…' : 'PDF'}</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
