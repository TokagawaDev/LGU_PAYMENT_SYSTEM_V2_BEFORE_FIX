import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SERVICE_IDS, ServiceId } from '@shared/constants/services';

export type SettingsDocument = Settings & Document;

@Schema({ _id: false })
export class ServiceFormField {
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

export const ServiceFormFieldSchema = SchemaFactory.createForClass(ServiceFormField);

@Schema({ _id: false })
export class ServiceFormConfig {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [ServiceFormFieldSchema], default: [] })
  formFields!: ServiceFormField[];

  @Prop({ required: true, min: 0, default: 0 })
  baseAmount!: number;

  @Prop({ required: true, min: 0, default: 0 })
  processingFee!: number;
}

export const ServiceFormConfigSchema = SchemaFactory.createForClass(ServiceFormConfig);

@Schema({
  timestamps: true,
  collection: 'settings',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Settings {
  @Prop({
    type: {
      name: { type: String, required: true, default: 'Default' },
      fullName: { type: String, required: true, default: 'City of Default' },
    },
    required: true,
    default: {
      name: 'Default',
      fullName: 'City of Default',
    },
    _id: false,
  })
  city!: { name: string; fullName: string };

  @Prop({
    type: {
      systemName: { type: String, required: true, default: 'Payment System' },
      systemDescription: {
        type: String,
        required: true,
        default: 'Official payment system for city services',
      },
    },
    required: true,
    default: {
      systemName: 'Payment System',
      systemDescription: 'Official payment system for city services',
    },
    _id: false,
  })
  branding!: {
    systemName: string;
    systemDescription: string;
  };

  @Prop({
    type: {
      address: { type: String, required: true, default: 'City Hall' },
      phone: { type: String, required: true, default: '+63 (2) 0000-0000' },
      email: { type: String, required: true, default: 'info@city.gov.ph' },
      website: { type: String, required: true, default: 'https://city.gov.ph' },
    },
    required: true,
    default: {
      address: 'City Hall',
      phone: '+63 (2) 0000-0000',
      email: 'info@city.gov.ph',
      website: 'https://city.gov.ph',
    },
    _id: false,
  })
  contact!: {
    address: string;
    phone: string;
    email: string;
    website: string;
  };

  @Prop({
    type: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        category: {
          type: String,
          enum: ['general', 'payment', 'technical', 'account'],
          required: true,
          default: 'general',
        },
      },
    ],
    default: [],
  })
  faq!: Array<{
    question: string;
    answer: string;
    category: 'general' | 'payment' | 'technical' | 'account';
  }>;

  @Prop({
    type: {
      headerBackgroundUrl: { type: String, required: true, default: '/uploads/homepage-header.jpg' },
      sealLogoUrl: { type: String, required: true, default: '/uploads/seal-logo.svg' },
      faviconUrl: { type: String, required: true, default: '/uploads/favicon.ico' },
    },
    required: true,
    default: {
      headerBackgroundUrl: '/uploads/homepage-header.jpg',
      sealLogoUrl: '/uploads/seal-logo.svg',
      faviconUrl: '/uploads/favicon.ico',
    },
    _id: false,
  })
  assets!: {
    headerBackgroundUrl: string;
    sealLogoUrl: string;
    faviconUrl: string;
  };

  @Prop({
    type: {
      card: {
        percent: { type: Number, default: 0 },
        fixed: { type: Number, default: 0 },
        min: { type: Number, default: 0 },
      },
      digitalWallets: {
        percent: { type: Number, default: 0 },
        fixed: { type: Number, default: 0 },
        min: { type: Number, default: 0 },
      },
      dob: {
        percent: { type: Number, default: 0 },
        fixed: { type: Number, default: 0 },
        min: { type: Number, default: 0 },
      },
      qrph: {
        percent: { type: Number, default: 0 },
        fixed: { type: Number, default: 0 },
        min: { type: Number, default: 0 },
      },
    },
    _id: false,
    default: {
      card: { percent: 3.5, fixed: 15, min: 0 },
      digitalWallets: { percent: 2.5, fixed: 0, min: 0 },
      dob: { percent: 0.8, fixed: 0, min: 15 },
      qrph: { percent: 1.5, fixed: 0, min: 0 },
    },
  })
  convenienceFee?: {
    card: { percent: number; fixed: number; min: number };
    digitalWallets: { percent: number; fixed: number; min: number };
    dob: { percent: number; fixed: number; min: number };
    qrph: { percent: number; fixed: number; min: number };
  };

  @Prop({
    type: Map,
    of: { type: Boolean, default: true },
    default: () => {
      const services: Record<ServiceId, boolean> = {} as Record<ServiceId, boolean>;
      Object.values(SERVICE_IDS).forEach((serviceId) => {
        services[serviceId] = true;
      });
      return services;
    },
  })
  enabledServices!: Map<ServiceId, boolean>;

  @Prop({ type: Map, of: ServiceFormConfigSchema, default: () => ({}) })
  formConfigs?: Map<ServiceId, ServiceFormConfig>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  /** Custom payment services created by admin, shown in Payment Services (citizen portal) */
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: false, default: '' },
        baseAmount: { type: Number, required: true, min: 0, default: 0 },
        processingFee: { type: Number, required: true, min: 0, default: 0 },
        enabled: { type: Boolean, required: false, default: true },
        formFields: {
          type: [
            {
              id: { type: String, required: true },
              label: { type: String, required: true },
              type: { type: String, required: true, enum: ['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'date', 'cost', 'password', 'radio', 'checkbox'] },
              required: { type: Boolean, default: false },
              placeholder: { type: String, required: false, default: '' },
              reminder: { type: String, required: false }, // Optional reminder text (shown in red)
              options: { type: [{ value: { type: String }, label: { type: String } }], default: [] },
              validation: {
                type: {
                  min: { type: Number },
                  max: { type: Number },
                  pattern: { type: String },
                  message: { type: String },
                },
                required: false,
                _id: false,
              },
            },
          ],
          default: [],
        },
      },
    ],
    default: [],
    _id: false,
  })
  customPaymentServices!: Array<{
    id: string;
    title: string;
    description: string;
    baseAmount: number;
    processingFee: number;
    enabled?: boolean;
    formFields?: Array<{
      id: string;
      label: string;
      type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'cost';
      required?: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
      };
    }>;
  }>;

  /** Add-on services (e.g. Community Tax Certificate) created by admin, shown in Application (citizen portal) */
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: false, default: '' },
        icon: { type: String, default: 'FileText' },
        color: { type: String, default: 'bg-blue-500' },
        visible: { type: Boolean, required: false, default: false }, // Hidden by default in application form list
        formFields: {
          type: [
            {
              type: { type: String, required: true, enum: ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] },
              label: { type: String, required: true },
              placeholder: { type: String, required: false, default: '' },
              required: { type: Boolean, default: false },
              options: { type: [{ value: { type: String }, label: { type: String } }], default: [] },
                stepIndex: { type: Number, required: false }, // For multi-step forms like Business Permit
                helpText: { type: String, required: false },
                fieldOrder: { type: Number, required: false },
                header: { type: String, required: false }, // Optional header/label above the field
                reminder: { type: String, required: false }, // Optional reminder text (shown in red)
              },
            ],
            default: [],
          },
          buttonTexts: {
            type: {
              back: { type: String, required: false },
              next: { type: String, required: false },
              submit: { type: String, required: false },
              saveAsDraft: { type: String, required: false },
              cancel: { type: String, required: false },
            },
            required: false,
          },
          buttonVisibility: {
            type: {
              back: { type: Boolean, required: false, default: true },
              next: { type: Boolean, required: false, default: true },
              submit: { type: Boolean, required: false, default: true },
              saveAsDraft: { type: Boolean, required: false, default: false },
              cancel: { type: Boolean, required: false, default: false },
            },
            required: false,
          },
          formSteps: {
          type: [
            {
              index: { type: Number, required: true },
              letter: { type: String, required: true },
              label: { type: String, required: true },
              buttonTexts: {
                type: {
                  back: { type: String, required: false },
                  next: { type: String, required: false },
                  submit: { type: String, required: false },
                  saveAsDraft: { type: String, required: false },
                  cancel: { type: String, required: false },
                },
                required: false,
              },
              buttonVisibility: {
                type: {
                  back: { type: Boolean, required: false },
                  next: { type: Boolean, required: false },
                  submit: { type: Boolean, required: false },
                  saveAsDraft: { type: Boolean, required: false },
                  cancel: { type: Boolean, required: false },
                },
                required: false,
              },
            },
          ],
          default: [],
        },
      },
    ],
    default: [],
    _id: false,
  })
  addOnServices!: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    formFields?: Array<{
      type: 'text' | 'number' | 'email' | 'password' | 'date' | 'file' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'submit' | 'reset';
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
      stepIndex?: number;
    }>;
    formSteps?: Array<{
      index: number;
      letter: string;
      label: string;
    }>;
  }>;

  // added by timestamps option
  createdAt?: Date;
  updatedAt?: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);


