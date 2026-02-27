import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomPaymentServiceDocument = CustomPaymentService & Document;

@Schema({ _id: false })
export class CustomPaymentServiceFormField {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({
    required: true,
    enum: ['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'date', 'cost', 'password', 'radio', 'checkbox'],
  })
  type!: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost' | 'password' | 'radio' | 'checkbox';

  @Prop({ default: false })
  required?: boolean;

  @Prop()
  placeholder?: string;

  @Prop()
  reminder?: string;

  @Prop({ type: [{ value: { type: String }, label: { type: String } }], default: [] })
  options?: Array<{ value: string; label: string }>;

  @Prop({
    type: {
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String },
      message: { type: String },
    },
    _id: false,
  })
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export const CustomPaymentServiceFormFieldSchema = SchemaFactory.createForClass(CustomPaymentServiceFormField);

@Schema({
  timestamps: true,
  collection: 'custom_payment_services',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomPaymentService {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ required: true, min: 0, default: 0 })
  baseAmount!: number;

  @Prop({ required: true, min: 0, default: 0 })
  processingFee!: number;

  @Prop({ default: true, index: true })
  enabled!: boolean;

  @Prop({ type: [CustomPaymentServiceFormFieldSchema], default: [] })
  formFields!: CustomPaymentServiceFormField[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomPaymentServiceSchema = SchemaFactory.createForClass(CustomPaymentService);
