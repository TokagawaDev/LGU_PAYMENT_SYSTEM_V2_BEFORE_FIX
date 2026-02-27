import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminCustomFormDocument = AdminCustomForm & Document;

const FIELD_TYPES = [
  'text',
  'number',
  'email',
  'password',
  'date',
  'file',
  'select',
  'radio',
  'checkbox',
  'textarea',
  'submit',
  'reset',
] as const;

@Schema({ _id: false })
export class FormFieldValidation {
  @Prop()
  min?: number;
  @Prop()
  max?: number;
  @Prop()
  pattern?: string;
  @Prop()
  message?: string;
}
export const FormFieldValidationSchema =
  SchemaFactory.createForClass(FormFieldValidation);

@Schema({ _id: false })
export class AdminCustomFormField {
  @Prop({ type: String, required: true, enum: FIELD_TYPES })
  type!: (typeof FIELD_TYPES)[number];
  @Prop({ type: String, required: true })
  label!: string;
  @Prop({ type: String, default: '' })
  placeholder?: string;
  @Prop({ type: Boolean, default: false })
  required?: boolean;
  @Prop({ type: [{ value: String, label: String }], default: [] })
  options?: Array<{ value: string; label: string }>;
  @Prop({ type: FormFieldValidationSchema, required: false })
  validation?: FormFieldValidation;
}
export const AdminCustomFormFieldSchema =
  SchemaFactory.createForClass(AdminCustomFormField);

@Schema({
  timestamps: true,
  collection: 'admin_custom_forms',
})
export class AdminCustomForm {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
    index: true,
  })
  status!: 'draft' | 'published';

  @Prop({ type: [AdminCustomFormFieldSchema], default: [] })
  formFields!: AdminCustomFormField[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const AdminCustomFormSchema =
  SchemaFactory.createForClass(AdminCustomForm);
AdminCustomFormSchema.index({ userId: 1, updatedAt: -1 });
