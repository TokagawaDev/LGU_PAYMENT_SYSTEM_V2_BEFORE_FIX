'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentServiceConfig } from '@/constants/payment-services';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PaymentStepProps {
  serviceConfig: PaymentServiceConfig;
  isLoading: boolean;
  onPaymentSubmit: (
    method: 'card' | 'digital-wallets' | 'dob' | 'qrph'
  ) => void;
  onBackToReview: () => void;
  overrideBaseAmount?: number;
}

/**
 * Payment Step Component
 * Handles payment method selection and payment processing
 */
export function PaymentStep({
  serviceConfig,
  isLoading,
  onPaymentSubmit,
  onBackToReview,
  overrideBaseAmount,
}: PaymentStepProps): React.JSX.Element {
  const baseAmount =
    typeof overrideBaseAmount === 'number'
      ? overrideBaseAmount
      : serviceConfig.baseAmount;
  const totalAmount = baseAmount + serviceConfig.processingFee;
  const [method, setMethod] = useState<
    'card' | 'digital-wallets' | 'dob' | 'qrph'
  >('card');
  const [convenience, setConvenience] = useState<{
    percent: number;
    fixed: number;
    min: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${API_BASE_URL}/settings/public`);
        if (!res.ok) return;
        const settings = await res.json();
        const fee = settings?.convenienceFee;
        if (!fee) {
          setConvenience(null);
          return;
        }
        if (method === 'card')
          setConvenience({
            percent: fee.card?.percent || 0,
            fixed: fee.card?.fixed || 0,
            min: fee.card?.min || 0,
          });
        if (method === 'digital-wallets')
          setConvenience({
            percent: fee.digitalWallets?.percent || 0,
            fixed: fee.digitalWallets?.fixed || 0,
            min: fee.digitalWallets?.min || 0,
          });
        if (method === 'dob')
          setConvenience({
            percent: fee.dob?.percent || 0,
            fixed: fee.dob?.fixed || 0,
            min: fee.dob?.min || 0,
          });
        if (method === 'qrph')
          setConvenience({
            percent: fee.qrph?.percent || 0,
            fixed: fee.qrph?.fixed || 0,
            min: fee.qrph?.min || 0,
          });
      } catch {
        /* ignore */
      }
    };
    void load();
  }, [method]);

  const computedConvenience = useMemo(() => {
    if (!convenience) return 0;
    const percentPhp = (convenience.percent / 100) * totalAmount;
    const raw = percentPhp + convenience.fixed;
    const withMin = Math.max(raw, convenience.min || 0);
    return Math.round(withMin * 100) / 100;
  }, [convenience, totalAmount]);

  const payable = useMemo(() => {
    return Math.round((totalAmount + computedConvenience) * 100) / 100;
  }, [totalAmount, computedConvenience]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Payment</CardTitle>
        <p className="text-gray-600">Complete your payment securely</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div>
          <h3 className="text-lg font-medium mb-4">Payment Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Service:</span>
              <span>{serviceConfig.title}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee:</span>
              <span>₱{baseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Processing Fee:</span>
              <span>₱{serviceConfig.processingFee.toLocaleString()}</span>
            </div>
            {computedConvenience > 0 && (
              <div className="flex justify-between">
                <span>Convenience Fee ({method}):</span>
                <span>₱{computedConvenience.toLocaleString()}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount:</span>
              <span>₱{payable.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Amount to Pay</p>
            <p className="text-3xl font-bold text-blue-600">
              ₱{payable.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Select Payment Method</h3>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                className="mr-3"
                value="card"
                checked={method === 'card'}
                onChange={() => setMethod('card')}
              />
              <div>
                <p className="font-medium">Credit/Debit Card</p>
                <p className="text-sm text-gray-600">
                  Visa, Mastercard
                  {computedConvenience > 0 && method === 'card'
                    ? ` • Convenience fee ₱${computedConvenience.toLocaleString()}`
                    : ''}
                </p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                className="mr-3"
                value="digital-wallets"
                checked={method === 'digital-wallets'}
                onChange={() => setMethod('digital-wallets')}
              />
              <div>
                <p className="font-medium">Digital Wallets</p>
                <p className="text-sm text-gray-600">
                  GCash, Maya
                  {computedConvenience > 0 && method === 'digital-wallets'
                    ? ` • Convenience fee ₱${computedConvenience.toLocaleString()}`
                    : ''}
                </p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                className="mr-3"
                value="dob"
                checked={method === 'dob'}
                onChange={() => setMethod('dob')}
              />
              <div>
                <p className="font-medium">Online Banking</p>
                <p className="text-sm text-gray-600">
                  Direct bank transfer
                  {computedConvenience > 0 && method === 'dob'
                    ? ` • Convenience fee ₱${computedConvenience.toLocaleString()}`
                    : ''}
                </p>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                className="mr-3"
                value="qrph"
                checked={method === 'qrph'}
                onChange={() => setMethod('qrph')}
              />
              <div>
                <p className="font-medium">QRPH</p>
                <p className="text-sm text-gray-600">
                  Scan to pay
                  {computedConvenience > 0 && method === 'qrph'
                    ? ` • Convenience fee ₱${computedConvenience.toLocaleString()}`
                    : ''}
                </p>
              </div>
            </label>
          </div>
        </div>
        {/* Warning about cancelling checkout */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md">
          <p className="text-sm">
            Warning: Closing or leaving the checkout page will mark the payment
            as failed.
          </p>
        </div>
        <div className="flex justify-between pt-6">
          <Button type="button" variant="outline" onClick={onBackToReview}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Button>
          <Button onClick={() => onPaymentSubmit(method)} disabled={isLoading}>
            {isLoading ? 'Processing Payment...' : 'Pay Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
