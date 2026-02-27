import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { EmailService } from '../auth/services/email.service';
import { SettingsService } from '../settings/settings.service';
import crypto from 'crypto';
import { environmentConfig } from '../../config/environment';
import { BreakdownCode } from '../transactions/dto/create-transaction.dto';
import https from 'https';
import { URL } from 'url';
import { buildServiceReference, normalizeToServiceId } from '@shared/constants/services';

type PaymentMethodType = 'card' | 'digital-wallets' | 'dob' | 'qrph';

type CreateCheckoutSessionInput = {
  transactionId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  paymentMethod?: PaymentMethodType;
};

type PaymongoCheckoutResponse = {
  data: {
    id: string;
    attributes: {
      checkout_url: string;
      payment_intent_id?: string;
      status: string;
    };
  };
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
  ) {}

  private buildPaymongoDescription(params: { reference?: string; userFullName?: string; userEmail?: string; serviceName?: string }): string {
    const parts: string[] = [];
    const ref = params.reference?.trim();
    const name = params.userFullName?.trim();
    const email = params.userEmail?.trim();
    const service = params.serviceName?.trim();
    if (ref) parts.push(ref);
    if (name) parts.push(name);
    if (email) parts.push(email);
    if (service) parts.push(service);
    if (parts.length === 0) return 'LGU payment';
    return parts.join(' | ');
  }

  private getSecretKey(): string {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) throw new InternalServerErrorException('PAYMONGO_SECRET_KEY is not configured');
    return key;
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ checkoutUrl: string; providerSessionId: string }> {
    const { transactionId, description, successUrl, cancelUrl, paymentMethod } = input;

    const tx = await this.transactionModel.findById(transactionId).exec();
    if (!tx) throw new BadRequestException('Transaction not found');
    if (tx.totalAmountMinor <= 0) throw new BadRequestException('Invalid amount');

    const amount = tx.totalAmountMinor; // already in minor units

    // Append transactionId to success URL so the frontend can render the receipt
    let successUrlWithTx: string = successUrl;
    // Also append transactionId to cancel URL so the app can mark as failed when user returns
    let cancelUrlWithTx: string = cancelUrl;
    try {
      const success = new URL(successUrl);
      success.searchParams.set('transactionId', tx.id);
      successUrlWithTx = success.toString();
    } catch {
      // Fallback to original successUrl if parsing fails
      successUrlWithTx = successUrl;
    }
    try {
      const cancel = new URL(cancelUrl);
      cancel.searchParams.set('transactionId', tx.id);
      cancelUrlWithTx = cancel.toString();
    } catch {
      cancelUrlWithTx = cancelUrl;
    }

    const finalDescription = this.buildPaymongoDescription({
      reference: tx.details?.reference,
      userFullName: tx.userFullName,
      userEmail: tx.userEmail,
      serviceName: tx.service?.name,
    }) + (description ? ` | ${description}` : '');

    const body = {
      data: {
        attributes: {
          billing: null,
          cancel_url: cancelUrlWithTx,
          description: finalDescription,
          line_items: [
            {
              currency: 'PHP',
              amount,
              description: tx.service?.name || 'LGU Service',
              name: tx.details?.reference || 'Reference',
              quantity: 1,
            },
          ],
          payment_method_types: (() => {
            if (!paymentMethod) return ['card', 'gcash', 'paymaya', 'dob', 'qrph'];
            if (paymentMethod === 'digital-wallets') return ['gcash', 'paymaya'];
            return [paymentMethod];
          })(),
          reference_number: tx.details?.reference || undefined,
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          success_url: successUrlWithTx,
          statement_descriptor: 'LGU Payment',
          metadata: {
            transactionId: tx.id,
            reference: tx?.details?.reference || '',
            userEmail: tx?.userEmail || '',
            userFullName: tx?.userFullName || '',
            serviceId: tx?.service?.serviceId || '',
            serviceName: tx?.service?.name || '',
            user: {
              id: tx?.userId || '',
              email: tx?.userEmail || '',
              fullName: tx?.userFullName || '',
            },
          },
        },
      },
    } as const;

    const data = (await this.postJson<PaymongoCheckoutResponse>(
      'https://api.paymongo.com/v1/checkout_sessions',
      {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(this.getSecretKey()).toString('base64')}`,
      },
      body,
    ));
    const checkoutUrl = data?.data?.attributes?.checkout_url;
    const providerSessionId = data?.data?.id;
    if (!checkoutUrl || !providerSessionId) {
      throw new InternalServerErrorException('Invalid PayMongo response');
    }

    // Update transaction to awaiting_payment and store provider references
    const initialChannel = (() => {
      if (paymentMethod === 'card') return { channel: 'card' as const, subchannel: undefined };
      if (paymentMethod === 'digital-wallets') return { channel: 'online_wallet' as const, subchannel: 'gcash' };
      if (paymentMethod === 'dob') return { channel: 'online_banking' as const, subchannel: undefined };
      if (paymentMethod === 'qrph') return { channel: 'qrph' as const, subchannel: undefined };
      return { channel: 'other' as const, subchannel: undefined };
    })();

    await this.transactionModel.findByIdAndUpdate(transactionId, {
      $set: {
        status: 'awaiting_payment',
        payment: {
          provider: 'paymongo',
          channel: initialChannel.channel,
          subchannel: initialChannel.subchannel,
          providerSessionId: providerSessionId,
          providerStatus: data?.data?.attributes?.status,
          raw: undefined,
        },
      },
    }).exec();

    return { checkoutUrl, providerSessionId };
  }

  async verifyAndProcessWebhook(rawBody: Buffer, signatureHeader: string): Promise<void> {
    const secret = environmentConfig.paymongoWebhookSecret;
    if (!secret) {
      throw new InternalServerErrorException('PAYMONGO_WEBHOOK_SECRET not configured');
    }

    // Signature format: t=timestamp, v1=signature
    const parts = signatureHeader.split(',').map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith('t='));
    const tePart = parts.find((p) => p.startsWith('te='));
    const liPart = parts.find((p) => p.startsWith('li='));
    const timestamp = tPart ? tPart.slice(2) : '';
    const teSig = tePart ? tePart.slice(3) : '';
    const liSig = liPart ? liPart.slice(3) : '';
    if (!timestamp || (!teSig && !liSig)) throw new BadRequestException('Invalid signature header');

    const payloadToSign = `${timestamp}.${rawBody.toString('utf8')}`;
    const computed = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

    const isTestSecret = /test/i.test(secret);
    const candidates: string[] = [];
    if (isTestSecret && teSig) candidates.push(teSig);
    if (!isTestSecret && liSig) candidates.push(liSig);
    // Fallback: try both if unsure
    if (candidates.length === 0) {
      if (teSig) candidates.push(teSig);
      if (liSig) candidates.push(liSig);
    }

    const valid = candidates.some((sig) => {
      if (!sig) return false;
      if (sig.length !== computed.length) return false;
      try {
        const a = new Uint8Array(Buffer.from(sig, 'hex'));
        const b = new Uint8Array(Buffer.from(computed, 'hex'));
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
      } catch {
        return false;
      }
    });
    if (!valid) throw new BadRequestException('Invalid signature header');

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      data?: { attributes?: { type?: string } };
    };
    const type = String(event?.type || event?.data?.attributes?.type || '');
    if (!type) return;

    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      await this.processPaidEvent(event);
      return;
    }

    if (type === 'payment.refunded' || type === 'payment.refund.updated' || type === 'refund.created' || type === 'refund.updated') {
      await this.processRefundEvent(event);
      return;
    }

    // Handle additional failed/expired cases
    if (
      type === 'payment.failed' ||
      type === 'checkout_session.payment.failed' ||
      type === 'checkout_session.expired' ||
      type === 'payment.expired' ||
      type === 'payment.cancelled' ||
      /failed|expired/i.test(type)
    ) {
      await this.processFailedEvent(event);
      return;
    }
  }

  private async processPaidEvent(event: { data?: { attributes?: unknown } }): Promise<void> {
    const attr = (event?.data?.attributes || {}) as Record<string, unknown> & {
      reference_number?: string;
      success_url?: string;
      payments?: Array<{ attributes?: { source?: { type?: string } } & Record<string, unknown> }>;
      payment_intent?: { attributes?: { metadata?: Record<string, unknown> } };
      metadata?: Record<string, unknown>;
      data?: { attributes?: { external_reference_number?: string } };
      status?: string;
    };
    const meta: Record<string, unknown> | undefined =
      attr?.metadata ||
      (attr?.payment_intent as { attributes?: { metadata?: Record<string, unknown> } } | undefined)?.attributes?.metadata ||
      ((attr?.payments?.[0]?.attributes as { metadata?: Record<string, unknown> } | undefined)?.metadata) ||
      (attr?.data as { attributes?: { metadata?: Record<string, unknown> } } | undefined)?.attributes?.metadata ||
      undefined;

    let transactionId: string | undefined = String((meta as Record<string, unknown> | undefined)?.transactionId || '');
    // Fallback: extract from success_url query param
    if (!transactionId && typeof attr?.success_url === 'string') {
      try {
        const u = new URL(attr.success_url);
        const tid = u.searchParams.get('transactionId');
        if (tid) transactionId = tid;
      } catch {
        // ignore parse errors
      }
    }
    const reference: string | undefined = String(
      (meta as Record<string, unknown> | undefined)?.reference ||
      attr?.reference_number ||
      (attr?.data as { attributes?: { external_reference_number?: string } } | undefined)?.attributes?.external_reference_number ||
      ''
    );

    if (!transactionId && reference) {
      const tx = await this.transactionModel.findOne({ 'details.reference': reference }).exec();
      transactionId = tx?._id?.toString();
    }
    if (!transactionId) return;

    const channel = (() => {
      const pm = ((attr?.payments?.[0]?.attributes || (attr?.data as { attributes?: Record<string, unknown> } | undefined)?.attributes) || {}) as {
        source?: { type?: string };
        payment_method_used?: string;
      };
      const method = String(
        pm?.source?.type ||
        pm?.payment_method_used ||
        (attr as { payment_method_used?: string }).payment_method_used ||
        (attr as { payment_method?: string }).payment_method ||
        ''
      ).toLowerCase();
      if (method.includes('card')) return { channel: 'card', subchannel: undefined } as const;
      if (method.includes('gcash')) return { channel: 'online_wallet', subchannel: 'gcash' } as const;
      if (method.includes('maya') || method.includes('paymaya')) return { channel: 'online_wallet', subchannel: 'paymaya' } as const;
      if (method.includes('bank') || method.includes('dob')) return { channel: 'online_banking', subchannel: undefined } as const;
      if (method.includes('qris') || method.includes('qrph')) return { channel: 'qrph', subchannel: undefined } as const;
      return { channel: 'other', subchannel: undefined } as const;
    })();

    const candidateIds: Array<string | undefined> = [
      (attr?.payments?.[0] as { id?: string } | undefined)?.id,
      (attr?.data as { id?: string } | undefined)?.id,
      (event as { data?: { id?: string } } | undefined)?.data?.id,
    ];
    const paymentId: string | undefined = candidateIds.find((id) => typeof id === 'string' && id.startsWith('pay_')) as string | undefined;
    const sessionId: string | undefined = candidateIds.find((id) => typeof id === 'string' && id.startsWith('cs_')) as string | undefined;

    const setFields: Record<string, unknown> = {
      status: 'paid' as const,
      'payment.providerStatus': String(attr?.status || 'paid'),
      // payment_intent may be nested object in checkout_session events or a string id in payment.paid events
      'payment.providerIntentId': String(
        (attr?.payment_intent as { id?: string } | undefined)?.id ||
        (attr as { payment_intent_id?: string } | undefined)?.payment_intent_id ||
        ''
      ),
      'payment.channel': channel.channel,
      'payment.subchannel': channel.subchannel,
      'payment.paidAt': new Date(),
    };
    if (paymentId) setFields['payment.providerTransactionId'] = paymentId;
    if (sessionId) setFields['payment.providerSessionId'] = sessionId;

    const update = { $set: setFields } as const;

    if (transactionId) {
      const res = await this.transactionModel.updateOne({ _id: transactionId }, update).exec();
      if (res.matchedCount === 0 && reference) {
        await this.transactionModel.updateMany({ 'details.reference': reference }, update).exec();
      }
      // If we did not get a pay_ id yet but have intentId or sessionId, try to resolve and backfill
      if (!paymentId) {
        const intentId: string | undefined = (attr?.payment_intent as { id?: string } | undefined)?.id || (attr as { payment_intent_id?: string } | undefined)?.payment_intent_id || undefined;
        const resolved = await this.resolveFinalPaymentId({ sessionId, intentId });
        if (resolved) {
          await this.transactionModel.updateOne({ _id: transactionId }, { $set: { 'payment.providerTransactionId': resolved } }).exec();
        }
      }
      // Attempt email notification
      await this.sendEmailIfNeeded({ transactionId, reference, kind: 'paid' });
    } else if (reference) {
      await this.transactionModel.updateMany({ 'details.reference': reference }, update).exec();
      if (!paymentId) {
        const intentId: string | undefined = (attr?.payment_intent as { id?: string } | undefined)?.id || (attr as { payment_intent_id?: string } | undefined)?.payment_intent_id || undefined;
        const resolved = await this.resolveFinalPaymentId({ sessionId, intentId });
        if (resolved) {
          await this.transactionModel.updateMany({ 'details.reference': reference }, { $set: { 'payment.providerTransactionId': resolved } }).exec();
        }
      }
      await this.sendEmailIfNeeded({ reference, kind: 'paid' });
    }
  }

  private async processFailedEvent(event: { data?: { attributes?: unknown } }): Promise<void> {
    const attr = (event?.data?.attributes || {}) as Record<string, unknown> & {
      reference_number?: string;
      success_url?: string;
      cancel_url?: string;
      payments?: Array<{ attributes?: { source?: { type?: string }; metadata?: Record<string, unknown> } & Record<string, unknown> }>;
      payment_intent?: { attributes?: { metadata?: Record<string, unknown> } } | { id?: string } | string;
      metadata?: Record<string, unknown>;
      data?: { attributes?: { external_reference_number?: string; metadata?: Record<string, unknown> } };
      status?: string;
    };

    const meta: Record<string, unknown> | undefined =
      attr?.metadata ||
      (typeof attr?.payment_intent === 'object' && attr?.payment_intent && 'attributes' in (attr.payment_intent as object)
        ? ((attr?.payment_intent as { attributes?: { metadata?: Record<string, unknown> } } | undefined)?.attributes?.metadata)
        : undefined) ||
      ((attr?.payments?.[0]?.attributes as { metadata?: Record<string, unknown> } | undefined)?.metadata) ||
      (attr?.data as { attributes?: { metadata?: Record<string, unknown> } } | undefined)?.attributes?.metadata ||
      undefined;

    let transactionId: string | undefined = String((meta as Record<string, unknown> | undefined)?.transactionId || '');
    if (!transactionId && typeof attr?.cancel_url === 'string') {
      try {
        const u = new URL(attr.cancel_url);
        const tid = u.searchParams.get('transactionId');
        if (tid) transactionId = tid;
      } catch { /* ignore */ }
    }
    if (!transactionId && typeof attr?.success_url === 'string') {
      try {
        const u = new URL(attr.success_url);
        const tid = u.searchParams.get('transactionId');
        if (tid) transactionId = tid;
      } catch { /* ignore */ }
    }

    const reference: string | undefined = String(
      (meta as Record<string, unknown> | undefined)?.reference ||
      attr?.reference_number ||
      (attr?.data as { attributes?: { external_reference_number?: string } } | undefined)?.attributes?.external_reference_number ||
      ''
    );

    const providerStatus = String(attr?.status || 'failed');

    // Update by id if available; else by reference if available
    if (transactionId) {
      await this.transactionModel.updateOne({ _id: transactionId }, { $set: { status: 'failed', 'payment.providerStatus': providerStatus } }).exec();
      await this.sendEmailIfNeeded({ transactionId, kind: 'failed' });
      return;
    }

    if (reference) {
      await this.transactionModel.updateMany(
        { 'details.reference': reference },
        { $set: { status: 'failed', 'payment.providerStatus': providerStatus } }
      ).exec();
      await this.sendEmailIfNeeded({ reference, kind: 'failed' });
    }
  }

  private async processRefundEvent(event: { data?: { id?: string; attributes?: unknown } }): Promise<void> {
    const attr = (event?.data?.attributes || {}) as {
      reference_number?: string;
      external_reference_number?: string;
      data?: { attributes?: { external_reference_number?: string; payment_id?: string } };
      payment?: { id?: string } | string;
      payment_id?: string;
      payment_intent?: { id?: string } | string;
      payment_intent_id?: string;
      status?: string;
      refund_status?: string;
    };
    const reference: string | undefined = String(
      attr?.reference_number ||
      attr?.external_reference_number ||
      attr?.data?.attributes?.external_reference_number ||
      ''
    );
    const paymentId: string | undefined = String(
      (typeof attr?.payment === 'string' ? attr.payment : (attr?.payment as { id?: string } | undefined)?.id) ||
      attr?.payment_id ||
      attr?.data?.attributes?.payment_id ||
      ''
    );
    const intentId: string | undefined = String(
      (typeof attr?.payment_intent === 'string' ? attr.payment_intent : (attr?.payment_intent as { id?: string } | undefined)?.id) ||
      attr?.payment_intent_id ||
      ''
    );
    const providerStatus = String(attr?.status || attr?.refund_status || 'refunded');

    const update = {
      $set: {
        status: 'refunded' as const,
        'payment.providerStatus': providerStatus,
      },
    } as const;

    if (paymentId) {
      await this.transactionModel.updateMany({ 'payment.providerTransactionId': paymentId }, update).exec();
    }

    if (intentId) {
      await this.transactionModel.updateMany({ 'payment.providerIntentId': intentId }, update).exec();
    }

    if (reference) {
      await this.transactionModel.updateMany({ 'details.reference': reference }, update).exec();
    }

    if (paymentId || intentId || reference) {
      await this.sendEmailIfNeeded({ reference, kind: 'refunded', paymentId, intentId });
    }
  }

  private async sendEmailIfNeeded(params: { transactionId?: string; reference?: string; kind: 'paid' | 'failed' | 'refunded'; paymentId?: string; intentId?: string }): Promise<void> {
    const query: Record<string, unknown> = params.transactionId
      ? { _id: params.transactionId }
      : params.reference
        ? { 'details.reference': params.reference }
        : params.paymentId
          ? { 'payment.providerTransactionId': params.paymentId }
          : params.intentId
            ? { 'payment.providerIntentId': params.intentId }
            : {};
    if (!Object.keys(query).length) return;

    const tx = await this.transactionModel.findOne(query).lean().exec();
    if (!tx) {
      this.logger.warn(`Email skip: no transaction found for query ${JSON.stringify(query)} (${params.kind})`);
      return;
    }
    const userEmail: string | undefined = tx.userEmail as string | undefined;
    if (!userEmail) {
      this.logger.warn(`Email skip: transaction ${String((tx as { _id?: unknown })._id)} has no userEmail`);
      return;
    }

    const now = new Date();
    const pathBase = `notifications.email` as const;
    const flagField = params.kind === 'paid' ? `${pathBase}.paidSentAt` : params.kind === 'failed' ? `${pathBase}.failedSentAt` : `${pathBase}.refundedSentAt`;
    const sendingField = params.kind === 'paid' ? `${pathBase}.paidSending` : params.kind === 'failed' ? `${pathBase}.failedSending` : `${pathBase}.refundedSending`;

    // Set a sending lock to avoid duplicate sends under concurrent webhook deliveries
    const lock = await this.transactionModel.updateOne(
      { _id: (tx as { _id: unknown })._id, [flagField]: { $exists: false }, $or: [ { [sendingField]: { $ne: true } }, { [sendingField]: { $exists: false } } ] },
      { $set: { [sendingField]: true } }
    ).exec();
    if (lock.modifiedCount === 0) return;

    try {
      // Build receipt items
      const breakdown = (tx.details as { breakdown?: Array<{ label?: string; amountMinor?: number }> } | undefined)?.breakdown || [];
      const items = breakdown.length > 0
        ? breakdown.map((b) => ({ label: String(b.label || ''), amount: `₱${(((b.amountMinor || 0) / 100).toFixed(2))}` }))
        : [
            { label: 'Total', amount: `₱${(((tx.totalAmountMinor as number) || 0) / 100).toFixed(2)}` },
          ];
      const total = `₱${(((tx.totalAmountMinor as number) || 0) / 100).toFixed(2)}`;

      const settings = await this.settingsService.getPublicSettings();
      const baseUrl = environmentConfig.frontendUrl || '';
      const sealLogoUrl = ((): string => {
        const url = settings.assets.sealLogoUrl;
        if (url && url.startsWith('/')) {
          return baseUrl ? `${baseUrl.replace(/\/$/, '')}${url}` : url;
        }
        return url;
      })();
      const referenceValue = String((tx.details as { reference?: string } | undefined)?.reference || '');
      const serviceName = String((tx.service as { name?: string } | undefined)?.name || 'LGU Service');
      const dateValue = new Date(tx.date as Date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const htmlReceipt = this.emailService.buildReceiptHtml({
        sealLogoUrl,
        cityName: settings.city.fullName,
        systemName: settings.branding.systemName,
        reference: referenceValue,
        dateTime: dateValue,
        serviceName,
        items,
        total,
      });

      const subjectMap = {
        paid: `Payment Successful - ${(tx.details as { reference?: string } | undefined)?.reference || 'Receipt'}`,
        failed: `Payment Failed - ${(tx.details as { reference?: string } | undefined)?.reference || ''}`,
        refunded: `Payment Refunded - ${(tx.details as { reference?: string } | undefined)?.reference || ''}`,
      } as const;

      const contentHtml = (() => {
        const greeting = `<p style="margin:0 0 12px;">Hello ${(tx.userFullName as string) || 'Customer'},</p>`;
        if (params.kind === 'paid') {
          return `
            <div style="font-size:14px;color:#0f172a;">
              ${greeting}
              <p style="margin:0 0 12px;">Your payment has been received. Below is your official receipt.</p>
              ${htmlReceipt}
            </div>
          `;
        }
        const outcome = params.kind === 'failed' ? 'failed' : 'refunded';
        const summary = `<p style="margin:0 0 12px;">Your payment for ${serviceName} amounting ${total} on ${dateValue} was ${outcome}. Reference: ${referenceValue}.</p>`;
        return `
          <div style="font-size:14px;color:#0f172a;">
            ${greeting}
            ${summary}
          </div>
        `;
      })();
      const html = this.emailService.buildBrandedEmailHtml({ title: subjectMap[params.kind], preheader: subjectMap[params.kind], contentHtml }, { cityName: settings.city.fullName, systemName: settings.branding.systemName });

      this.logger.log(`Sending ${params.kind} email to ${userEmail} for transaction ${(tx as { _id?: unknown })._id}`);
      const sent = await this.emailService.sendEmail({ to: userEmail, subject: subjectMap[params.kind], html });
      if (!sent) {
        this.logger.error(`Email send failed to ${userEmail} for transaction ${(tx as { _id?: unknown })._id}`);
      }

      await this.transactionModel.updateOne(
        { _id: (tx as { _id: unknown })._id },
        { $set: { [flagField]: now }, $unset: { [sendingField]: '' } }
      ).exec();
    } catch {
      await this.transactionModel.updateOne(
        { _id: (tx as { _id: unknown })._id },
        { $unset: { [sendingField]: '' } }
      ).exec();
    }
  }

  async initiatePayment(input: {
    serviceId: string;
    serviceName: string;
    approvalRequired?: boolean;
    reference?: string;
    breakdown: Array<{ code: BreakdownCode; label: string; amountMinor: number; metadata?: Record<string, unknown> }>;
    totalAmountMinor: number;
    formData?: Record<string, unknown>;
    user?: { id: string; email: string; fullName: string };
    paymentMethod?: PaymentMethodType;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutUrl: string; transactionId: string }> {
    const sum = input.breakdown.reduce((acc, item) => acc + item.amountMinor, 0);
    if (sum !== input.totalAmountMinor) {
      throw new BadRequestException('Total amount must equal the sum of breakdown items');
    }

    const now = new Date();
    // Do not reuse existing awaiting_payment transactions; always create a fresh transaction
    // Ensure unique reference: use provided or generate server-side with retries on duplicate key
    const serviceIdNormalized = normalizeToServiceId(input.serviceId) || (input.serviceId as never);
    const maxAttempts = 5;
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const reference = input.reference && String(input.reference).trim().length > 0
        ? input.reference
        : buildServiceReference({ serviceId: serviceIdNormalized, length: 13 });
      try {
        const tx = await this.transactionModel.create({
      date: now,
      service: {
        serviceId: input.serviceId,
        name: input.serviceName,
        otherInfo: {},
        approvalRequired: Boolean(input.approvalRequired),
      },
      totalAmountMinor: input.totalAmountMinor,
      details: {
        reference,
        breakdown: input.breakdown,
        formData: input.formData,
      },
      status: 'awaiting_payment',
              payment: {
          provider: 'paymongo',
          channel:
            input.paymentMethod === 'card' ? 'card'
            : input.paymentMethod === 'digital-wallets' ? 'online_wallet'
            : input.paymentMethod === 'dob' ? 'online_banking'
            : input.paymentMethod === 'qrph' ? 'qrph'
            : 'other',
          subchannel:
            input.paymentMethod === 'digital-wallets' ? 'gcash'
            : undefined,
        },
      userId: input.user?.id,
      userEmail: input.user?.email,
      userFullName: input.user?.fullName,
      createdByAdminId: input.user?.id || 'user',
        });
        const { checkoutUrl } = await this.createCheckoutSession({
          transactionId: tx.id,
          description: "",
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          paymentMethod: input.paymentMethod,
        });
        return { checkoutUrl, transactionId: tx.id };
      } catch (err) {
        const msg = String((err as { message?: string } | undefined)?.message || '');
        const code = (err as { code?: number | string } | undefined)?.code;
        const isDuplicateKey = msg.includes('duplicate key') || code === 11000;
        if (!isDuplicateKey) {
          lastErr = err;
          break;
        }
        lastErr = err;
        // retry with a new generated reference on duplicate key error
        continue;
      }
    }
    if (lastErr) throw lastErr;
    throw new InternalServerErrorException('Failed to create transaction');
  }

  private async postJson<T>(urlString: string, headers: Record<string, string>, body: unknown): Promise<T> {
    const urlObj = new URL(urlString);
    const payload = JSON.stringify(body ?? {});
    const options: https.RequestOptions = {
      method: 'POST',
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}${urlObj.search}`,
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    return new Promise<T>((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks: Uint8Array[] = [];
        res.on('data', (d: Buffer) => chunks.push(Buffer.isBuffer(d) ? new Uint8Array(d) : new Uint8Array(Buffer.from(d))));
        res.on('end', () => {
          const totalLen = chunks.reduce((sum, u) => sum + u.length, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const u of chunks) {
            merged.set(u, offset);
            offset += u.length;
          }
          const text = Buffer.from(merged).toString('utf8');
          const statusCode = res.statusCode || 0;
          if (statusCode < 200 || statusCode >= 300) {
            return reject(new InternalServerErrorException(`PayMongo error: ${statusCode} ${text}`));
          }
          try {
            const json = JSON.parse(text) as T;
            resolve(json);
          } catch {
            reject(new InternalServerErrorException('Invalid JSON response from PayMongo'));
          }
        });
      });
      req.on('error', (error) => reject(new InternalServerErrorException(String(error))));
      req.write(payload);
      req.end();
    });
  }

  private async getJson<T>(urlString: string, headers: Record<string, string>): Promise<T> {
    const urlObj = new URL(urlString);
    const options: https.RequestOptions = {
      method: 'GET',
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}${urlObj.search}`,
      headers,
    };

    return new Promise<T>((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks: Uint8Array[] = [];
        res.on('data', (d: Buffer) => chunks.push(Buffer.isBuffer(d) ? new Uint8Array(d) : new Uint8Array(Buffer.from(d))));
        res.on('end', () => {
          const totalLen = chunks.reduce((sum, u) => sum + u.length, 0);
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const u of chunks) {
            merged.set(u, offset);
            offset += u.length;
          }
          const text = Buffer.from(merged).toString('utf8');
          const statusCode = res.statusCode || 0;
          if (statusCode < 200 || statusCode >= 300) {
            return reject(new InternalServerErrorException(`PayMongo error: ${statusCode} ${text}`));
          }
          try {
            const json = JSON.parse(text) as T;
            resolve(json);
          } catch {
            reject(new InternalServerErrorException('Invalid JSON response from PayMongo'));
          }
        });
      });
      req.on('error', (error) => reject(new InternalServerErrorException(String(error))));
      req.end();
    });
  }

  private async resolveFinalPaymentId(params: { sessionId?: string; intentId?: string }): Promise<string | undefined> {
    const authHeader = { Authorization: `Basic ${Buffer.from(this.getSecretKey()).toString('base64')}` };
    // Prefer resolving via payment intent
    if (params.intentId) {
      try {
        const data = await this.getJson<{ data?: { attributes?: { payments?: Array<{ id?: string }> } } }>(
          `https://api.paymongo.com/v1/payment_intents/${params.intentId}`,
          authHeader,
        );
        const pid = data?.data?.attributes?.payments?.find((p) => typeof p?.id === 'string' && p.id.startsWith('pay_'))?.id;
        if (pid) return pid;
      } catch { /* no-op */ }
    }
    // Fallback: resolve via checkout session
    if (params.sessionId) {
      try {
        const data = await this.getJson<{ data?: { attributes?: { payments?: Array<{ id?: string }> } } }>(
          `https://api.paymongo.com/v1/checkout_sessions/${params.sessionId}`,
          authHeader,
        );
        const pid = data?.data?.attributes?.payments?.find((p) => typeof p?.id === 'string' && p.id.startsWith('pay_'))?.id;
        if (pid) return pid;
      } catch { /* no-op */ }
    }
    return undefined;
  }

  async cancelPendingTransaction(id: string): Promise<{ status: 'ok' }>{
    const tx = await this.transactionModel.findById(id).exec();
    if (!tx) throw new BadRequestException('Transaction not found');
    const immutable = ['paid', 'refunded', 'completed'] as const;
    if (immutable.includes(tx.status as never)) {
      return { status: 'ok' };
    }
    await this.transactionModel.findByIdAndUpdate(id, {
      $set: {
        status: 'failed',
        'payment.providerStatus': 'cancelled',
      },
    }).exec();
    await this.sendEmailIfNeeded({ transactionId: id, kind: 'failed' });
    return { status: 'ok' };
  }
}


