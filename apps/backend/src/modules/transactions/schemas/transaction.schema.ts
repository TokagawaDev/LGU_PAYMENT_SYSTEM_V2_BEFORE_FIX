import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export type TransactionStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'completed';

export type PaymentChannel =
  | 'online_wallet'
  | 'online_banking'
  | 'qrph'
  | 'card'
  | 'other';

@Schema({ _id: false })
export class ServiceSnapshot {
  @Prop({ required: true })
  serviceId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: Object })
  otherInfo?: Record<string, unknown>;

  @Prop({ default: false })
  approvalRequired?: boolean;
}

export const ServiceSnapshotSchema = SchemaFactory.createForClass(ServiceSnapshot);

@Schema({ _id: false })
export class BreakdownItem {
  @Prop({ required: true })
  code!: 'base' | 'tax' | 'convenience_fee' | 'processing_fee' | 'discount' | 'other';

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  amountMinor!: number; // integer centavos; discounts can be negative

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const BreakdownItemSchema = SchemaFactory.createForClass(BreakdownItem);

@Schema({ _id: false })
export class TransactionDetails {
  @Prop({ required: true, trim: true })
  reference!: string;

  @Prop({ type: [BreakdownItemSchema], default: [] })
  breakdown!: BreakdownItem[];

  @Prop({ type: Object })
  formData?: Record<string, unknown>;

  @Prop()
  notes?: string;
}

export const TransactionDetailsSchema = SchemaFactory.createForClass(TransactionDetails);

@Schema({ _id: false })
export class PaymentProviderInfo {
  @Prop({ required: true, default: 'paymongo' })
  provider!: 'paymongo';

  @Prop({ required: true, enum: ['online_wallet', 'online_banking', 'qrph', 'card', 'other'] })
  channel!: PaymentChannel;

  @Prop()
  subchannel?: string; 

  @Prop()
  providerSessionId?: string; 

  @Prop()
  providerTransactionId?: string;

  @Prop()
  providerIntentId?: string;

  @Prop()
  providerStatus?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  feeMinor?: number;

  @Prop({ type: Object })
  raw?: Record<string, unknown>;
}

export const PaymentProviderInfoSchema = SchemaFactory.createForClass(PaymentProviderInfo);

@Schema({ _id: false })
export class EmailNotificationFlags {
  @Prop()
  paidSentAt?: Date;

  @Prop()
  refundedSentAt?: Date;

  @Prop()
  failedSentAt?: Date;

  // transient flags to avoid duplicate sends in concurrent webhook deliveries
  @Prop()
  paidSending?: boolean;

  @Prop()
  refundedSending?: boolean;

  @Prop()
  failedSending?: boolean;
}

export const EmailNotificationFlagsSchema = SchemaFactory.createForClass(EmailNotificationFlags);

@Schema({ _id: false })
export class NotificationInfo {
  @Prop({ type: EmailNotificationFlagsSchema })
  email?: EmailNotificationFlags;
}

export const NotificationInfoSchema = SchemaFactory.createForClass(NotificationInfo);

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction {
  @Prop({ required: true })
  date!: Date; // business date for transaction

  @Prop({ type: ServiceSnapshotSchema, required: true })
  service!: ServiceSnapshot;

  @Prop({ required: true, min: 0 })
  totalAmountMinor!: number; // sum of details.breakdown

  @Prop({ type: TransactionDetailsSchema, required: true })
  details!: TransactionDetails;

  @Prop({
    type: String,
    enum: [
      'pending',
      'awaiting_payment',
      'paid',
      'refunded',
      'failed',
      'completed',
    ],
    default: 'pending',
  })
  status!: TransactionStatus;

  @Prop({ type: PaymentProviderInfoSchema })
  payment?: PaymentProviderInfo;

  @Prop()
  userId?: string;

  @Prop()
  userEmail?: string;

  @Prop()
  userFullName?: string;

  @Prop({ required: true })
  createdByAdminId!: string;

  @Prop({ type: NotificationInfoSchema })
  notifications?: NotificationInfo;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Indexes for common queries
TransactionSchema.index({ date: -1 });
TransactionSchema.index({ status: 1, date: -1 });
TransactionSchema.index({ 'service.serviceId': 1, date: -1 });
TransactionSchema.index({ 'details.reference': 1 }, { unique: true, sparse: true });
TransactionSchema.index({ 'payment.providerTransactionId': 1 }, { sparse: true });
TransactionSchema.index({ 'payment.providerSessionId': 1 }, { sparse: true });


