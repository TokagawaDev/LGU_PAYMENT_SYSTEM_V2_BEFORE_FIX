import React from 'react';
import Image from 'next/image';

export type ReceiptItem = {
  label: string;
  amount: string;
};

export interface ReceiptPaperProps {
  sealLogoUrl: string;
  cityName: string;
  systemName: string;
  reference: string;
  dateTime: string;
  serviceName: string;
  items: ReceiptItem[];
  total: string;
  note?: string;
  className?: string;
}

export function ReceiptPaper({
  sealLogoUrl,
  cityName,
  systemName,
  reference,
  dateTime,
  serviceName,
  items,
  total,
  note = 'Keep this receipt for your records. Thank you for your payment.',
  className,
}: ReceiptPaperProps): React.JSX.Element {
  return (
    <div
      className={[
        'mx-auto w-full max-w-[420px] bg-white text-black rounded-md border border-gray-300 shadow-sm p-6',
        'print:shadow-none print:border-0 print:max-w-full print:bg-white print:text-black',
        'select-none',
        className || '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 justify-center text-center">
        <Image
          src={sealLogoUrl}
          alt="City Seal"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          draggable={false}
          unoptimized
        />
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-gray-500">
            Official Receipt
          </span>
          <span className="text-sm font-semibold">{cityName}</span>
          <span className="text-sm font-semibold">{systemName}</span>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-gray-300" />

      <div className="text-xs font-mono space-y-1">
        <div className="flex justify-between">
          <span>Reference</span>
          <span className="font-semibold">{reference}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{dateTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Service</span>
          <span>{serviceName}</span>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-gray-300" />

      <div className="text-xs font-mono">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-8">Description</div>
          <div className="col-span-4 text-right">Amount</div>
        </div>
        <div className="mt-1 border-t border-gray-200" />
        {items.map((item, idx) => (
          <div
            key={`${item.label}-${idx}`}
            className="grid grid-cols-12 gap-2 py-1"
          >
            <div className="col-span-8">{item.label}</div>
            <div className="col-span-4 text-right">{item.amount}</div>
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-gray-300" />
        <div className="grid grid-cols-12 gap-2 py-1 text-sm font-semibold">
          <div className="col-span-8">Total</div>
          <div className="col-span-4 text-right">{total}</div>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-gray-300" />
      <p className="text-[10px] text-gray-500 text-center">{note}</p>
    </div>
  );
}

export default ReceiptPaper;

// Printing helpers
export interface ReceiptPrintParams {
  sealLogoUrl: string;
  cityName: string;
  systemName: string;
  reference: string;
  dateTime: string;
  serviceName: string;
  items: ReceiptItem[]; // amounts should already be formatted (e.g., ₱1,234.56)
  total: string; // formatted
  note?: string;
}

export function printReceipt(params: ReceiptPrintParams): void {
  const container = document.createElement('div');
  container.setAttribute(
    'style',
    [
      'max-width:420px',
      'margin:0 auto',
      'background:#ffffff',
      'color:#000000',
      'border:1px solid #e5e7eb',
      'border-radius:8px',
      'padding:24px',
      'font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      'font-size:12px',
      'line-height:18px',
      '-webkit-print-color-adjust:exact',
      'print-color-adjust:exact',
    ].join(';')
  );

  const rowsHtml = params.items
    .map(
      (i) => `
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 0;">
          <div>${i.label}</div>
          <div style="text-align:right">${i.amount}</div>
        </div>
      `
    )
    .join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;text-align:center;">
      <img src="${
        params.sealLogoUrl
      }" alt="Seal" width="40" height="40" style="width:40px;height:40px;object-fit:contain;"/>
      <div style="display:flex;flex-direction:column;">
        <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;">Official Receipt</span>
        <span style="font-size:14px;font-weight:600;">${params.cityName}</span>
        <span style="font-size:14px;font-weight:600;">${
          params.systemName
        }</span>
      </div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
      <div style="display:flex;justify-content:space-between;"><span>Reference</span><span style="font-weight:600">${
        params.reference
      }</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Date</span><span>${
        params.dateTime
      }</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Service</span><span>${
        params.serviceName
      }</span></div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px;"><div>Description</div><div style="text-align:right">Amount</div></div>
      <div style="border-top:1px solid #e5e7eb;margin-top:4px"></div>
      ${rowsHtml}
      <div style="margin:8px 0;border-top:1px dashed #d1d5db"></div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 0;font-weight:600;font-size:13px;"><div>Total</div><div style="text-align:right">${
        params.total
      }</div></div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <p style="font-size:10px;color:#6b7280;text-align:center;">${
      params.note ||
      'Keep this receipt for your records. Thank you for your payment.'
    }</p>
  `;

  const printRoot = document.createElement('div');
  printRoot.id = 'print-root';
  printRoot.style.position = 'fixed';
  printRoot.style.inset = '0';
  printRoot.style.background = 'white';
  printRoot.style.display = 'flex';
  printRoot.style.alignItems = 'flex-start';
  printRoot.style.justifyContent = 'center';
  printRoot.style.padding = '16px';
  printRoot.appendChild(container);
  document.body.appendChild(printRoot);
  setTimeout(() => {
    window.print();
    setTimeout(() => printRoot.remove(), 50);
  }, 0);
}

/**
 * Generate and download a PDF version of the receipt without opening the print dialog.
 * Uses html2canvas to rasterize the generated receipt DOM and jsPDF to export it.
 */
export async function downloadReceiptPdf(
  params: ReceiptPrintParams,
  options: { filename?: string } = {}
): Promise<void> {
  const { filename } = options;
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then((m) => m.default),
  ]);

  const container = document.createElement('div');
  container.setAttribute(
    'style',
    [
      'max-width:420px',
      'width:420px',
      'margin:0',
      'background:#ffffff',
      'color:#000000',
      'border:1px solid #e5e7eb',
      'border-radius:8px',
      'padding:24px',
      'font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      'font-size:12px',
      'line-height:18px',
      'position:fixed',
      'left:-10000px',
      'top:0',
      'z-index:-1',
    ].join(';')
  );

  const rowsHtml = params.items
    .map(
      (i) => `
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 0;">
          <div>${i.label}</div>
          <div style="text-align:right">${i.amount}</div>
        </div>
      `
    )
    .join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;text-align:center;">
      <img src="${
        params.sealLogoUrl
      }" alt="Seal" width="40" height="40" style="width:40px;height:40px;object-fit:contain;"/>
      <div style="display:flex;flex-direction:column;">
        <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;">Official Receipt</span>
        <span style="font-size:14px;font-weight:600;">${params.cityName}</span>
        <span style="font-size:14px;font-weight:600;">${
          params.systemName
        }</span>
      </div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
      <div style="display:flex;justify-content:space-between;"><span>Reference</span><span style="font-weight:600">${
        params.reference
      }</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Date</span><span>${
        params.dateTime
      }</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Service</span><span>${
        params.serviceName
      }</span></div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px;"><div>Description</div><div style="text-align:right">Amount</div></div>
      <div style="border-top:1px solid #e5e7eb;margin-top:4px"></div>
      ${rowsHtml}
      <div style="margin:8px 0;border-top:1px dashed #d1d5db"></div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px;padding:4px 0;font-weight:600;font-size:13px;"><div>Total</div><div style="text-align:right">${
        params.total
      }</div></div>
    </div>
    <div style="margin:16px 0;border-top:1px dashed #d1d5db"></div>
    <p style="font-size:10px;color:#6b7280;text-align:center;">${
      params.note ||
      'Keep this receipt for your records. Thank you for your payment.'
    }</p>
  `;

  document.body.appendChild(container);

  // Ensure images attempt CORS and layout is ready
  const images = Array.from(container.getElementsByTagName('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.crossOrigin = 'anonymous';
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const canvas = await html2canvas(container, {
    backgroundColor: '#ffffff',
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28; // 0.39in
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const canvasAspect = canvas.width / canvas.height;
  let drawW = Math.min(maxW, canvas.width);
  let drawH = drawW / canvasAspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * canvasAspect;
  }
  const x = (pageWidth - drawW) / 2;
  const y = margin;

  doc.addImage(imgData, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
  doc.save(
    filename || `receipt-${params.reference || 'transaction'}-${Date.now()}.pdf`
  );

  container.remove();
}
