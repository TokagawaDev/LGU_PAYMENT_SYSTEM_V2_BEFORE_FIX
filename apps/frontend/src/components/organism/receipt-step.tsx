'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentServiceConfig } from '@/constants/payment-services';
import type { PublicSettings } from '@/lib/settings';
import { fetchPublicSettings } from '@/lib/settings';
import { getTransactionById, TransactionData } from '@/lib/api/admin';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReceiptPaper, {
  downloadReceiptPdf,
} from '@/components/organism/receipt-paper';
import { usePathname, useRouter } from 'next/navigation';

interface ReceiptStepProps {
  serviceConfig: PaymentServiceConfig;
  transactionId: string;
  onViewTransactionHistory: () => void;
  onBackToDashboard: () => void;
}

/**
 * Receipt Step Component
 * Displays payment confirmation and transaction details
 */
export function ReceiptStep({
  serviceConfig,
  transactionId,
  onBackToDashboard,
}: ReceiptStepProps): React.JSX.Element {
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const totalAmount = serviceConfig.baseAmount + serviceConfig.processingFee;

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const transactionData = await getTransactionById(transactionId);
        setTransaction(transactionData);
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  // Poll for status updates until terminal state or timeout
  useEffect(() => {
    const terminalStatuses: Array<TransactionData['status']> = [
      'paid',
      'completed',
      'failed',
      'refunded',
    ];
    if (!transactionId) return;
    if (
      terminalStatuses.includes(
        transaction?.status as TransactionData['status']
      )
    )
      return;

    let attempts = 0;
    const maxAttempts = 30; // ~60s at 2s interval
    setIsPolling(true);
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const latest = await getTransactionById(transactionId);
        setTransaction(latest);
        if (terminalStatuses.includes(latest.status)) {
          clearInterval(interval);
          setIsPolling(false);
        }
      } catch {
        // ignore transient errors while polling
      } finally {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsPolling(false);
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [transactionId, transaction?.status]);

  useEffect(() => {
    let isMounted = true;
    fetchPublicSettings()
      .then((data) => {
        if (isMounted) setSettings(data);
      })
      .catch(() => {
        // defaults handled in fetchPublicSettings
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Use reference number from transaction data if available, otherwise use transaction ID
  const referenceNumber = transaction?.details?.reference || transactionId;
  const isUsingTransactionId = !transaction?.details?.reference;
  const transactionDate = transaction?.date
    ? new Date(transaction.date).toLocaleString()
    : new Date().toLocaleString();

  const systemName = useMemo(
    () => settings?.branding.systemName || 'Payment System',
    [settings]
  );
  const cityName = useMemo(() => settings?.city.fullName || 'LGU', [settings]);
  const sealLogoPath = useMemo(
    () => settings?.assets.sealLogoUrl || '/seal-logo.svg',
    [settings]
  );

  const status = transaction?.status;
  const isSuccess = status === 'paid' || status === 'completed';
  const isFailed = status === 'failed';
  const isPrintable = isSuccess || status === 'refunded';
  const isPendingLike = !isSuccess && !isFailed && status !== 'refunded';
  const headerTitle = isSuccess
    ? 'Payment Successful!'
    : isFailed
    ? 'Payment Failed'
    : 'Payment Status';
  const headerSubtitle = isSuccess
    ? 'Your payment has been processed successfully'
    : isFailed
    ? 'Your payment was cancelled or did not complete.'
    : 'Your payment is not completed yet.';

  const handleDownload = async (): Promise<void> => {
    const items =
      transaction?.details?.breakdown &&
      transaction.details.breakdown.length > 0
        ? transaction.details.breakdown.map((b) => ({
            label: b.label,
            amount: `₱${(b.amountMinor / 100).toFixed(2)}`,
          }))
        : [
            {
              label: 'Service Fee',
              amount: `₱${serviceConfig.baseAmount.toLocaleString()}`,
            },
            {
              label: 'Processing Fee',
              amount: `₱${serviceConfig.processingFee.toLocaleString()}`,
            },
          ];
    const totalString =
      transaction?.totalAmountMinor != null
        ? `₱${(transaction.totalAmountMinor / 100).toFixed(2)}`
        : `₱${totalAmount.toLocaleString()}`;

    await downloadReceiptPdf(
      {
        sealLogoUrl: sealLogoPath,
        cityName: cityName,
        systemName: systemName,
        reference: referenceNumber,
        dateTime: transactionDate,
        serviceName: serviceConfig.title,
        items,
        total: totalString,
      },
      { filename: `receipt-${referenceNumber}.pdf` }
    );
  };

  // Removed PNG downloader in favor of print-to-PDF flow

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Loading...</CardTitle>
          <p className="text-gray-600">Loading transaction details...</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="print:hidden">
        <CardTitle
          className={
            'text-xl font-semibold ' +
            (isSuccess
              ? 'text-green-600'
              : isFailed
              ? 'text-red-600'
              : 'text-gray-800')
          }
        >
          {headerTitle}
        </CardTitle>
        <p className="text-gray-600">{headerSubtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 items-center">
          {isFailed ? (
            <div className="w-full max-w-[600px]">
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                <p className="font-semibold mb-1">
                  Payment failed or was cancelled.
                </p>
                <p className="text-sm">
                  No receipt is generated for failed payments.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-gray-50 p-4 rounded-md border">
                <div>
                  <div className="text-gray-500">Reference</div>
                  <div className="font-mono">{referenceNumber}</div>
                </div>
                <div>
                  <div className="text-gray-500">Service</div>
                  <div>{serviceConfig.title}</div>
                </div>
                <div>
                  <div className="text-gray-500">Date</div>
                  <div>{transactionDate}</div>
                </div>
                <div>
                  <div className="text-gray-500">Status</div>
                  <div className="capitalize">{status}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`${pathname}?step=form&reset=1`)}
                >
                  Start Over
                </Button>
                <Button onClick={onBackToDashboard}>Go to Dashboard</Button>
              </div>
            </div>
          ) : (
            <>
              {isPendingLike ? (
                <div className="w-full max-w-[600px]">
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md">
                    <p className="font-semibold mb-1">Verifying payment...</p>
                    <p className="text-sm">
                      Please wait while we confirm your payment with the
                      provider. This may take up to a minute.
                    </p>
                    {isPolling && (
                      <p className="text-xs mt-2">Auto-refreshing status...</p>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const latest = await getTransactionById(
                            transactionId
                          );
                          setTransaction(latest);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Refresh Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="w-full"
                  ref={receiptRef}
                  id="receipt-print-area"
                >
                  <ReceiptPaper
                    sealLogoUrl={sealLogoPath}
                    cityName={cityName}
                    systemName={systemName}
                    reference={referenceNumber}
                    dateTime={transactionDate}
                    serviceName={serviceConfig.title}
                    items={
                      transaction?.details?.breakdown &&
                      transaction.details.breakdown.length > 0
                        ? transaction.details.breakdown.map((b) => ({
                            label: b.label,
                            amount: `₱${(b.amountMinor / 100).toFixed(2)}`,
                          }))
                        : [
                            {
                              label: 'Service Fee',
                              amount: `₱${serviceConfig.baseAmount.toLocaleString()}`,
                            },
                            {
                              label: 'Processing Fee',
                              amount: `₱${serviceConfig.processingFee.toLocaleString()}`,
                            },
                          ]
                    }
                    total={
                      transaction?.totalAmountMinor != null
                        ? `₱${(transaction.totalAmountMinor / 100).toFixed(2)}`
                        : `₱${totalAmount.toLocaleString()}`
                    }
                    note={
                      isUsingTransactionId
                        ? 'Reference number will be available in transaction history once confirmed.'
                        : undefined
                    }
                  />
                </div>
              )}

              <div className="w-full max-w-[420px] flex gap-2 justify-between print:hidden">
                {isPrintable && !isPendingLike && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                  >
                    Download Receipt
                  </Button>
                )}
                <Button onClick={onBackToDashboard} className="flex-1">
                  Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
