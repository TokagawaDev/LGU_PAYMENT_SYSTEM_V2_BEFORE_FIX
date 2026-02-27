import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomApplicationServiceDocument = CustomApplicationService & Document;

const APPLICATION_FIELD_TYPES = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;

@Schema({ _id: false })
export class CustomApplicationServiceField {
  @Prop({
    type: String,
    required: true,
    enum: APPLICATION_FIELD_TYPES,
  })
  type!: (typeof APPLICATION_FIELD_TYPES)[number];

  @Prop({ required: true })
  label!: string;

  @Prop()
  placeholder?: string;

  @Prop({ default: false })
  required?: boolean;

  @Prop({
    type: [{
      value: { type: String },
      label: { type: String },
      conditionalFields: [{
        type: { type: String },
        label: { type: String },
        placeholder: { type: String },
        options: [{ value: { type: String }, label: { type: String } }],
      }],
    }],
    default: [],
  })
  options?: Array<{ value: string; label: string; conditionalFields?: Array<{ type: string; label: string; placeholder?: string }> }>;

  @Prop()
  stepIndex?: number;

  @Prop()
  helpText?: string;

  @Prop()
  fieldOrder?: number;

  @Prop()
  header?: string;

  @Prop()
  description?: string;

  @Prop()
  reminder?: string;
}

export const CustomApplicationServiceFieldSchema = SchemaFactory.createForClass(CustomApplicationServiceField);

@Schema({ _id: false })
export class ButtonTexts {
  @Prop()
  back?: string;

  @Prop()
  next?: string;

  @Prop()
  submit?: string;

  @Prop()
  saveAsDraft?: string;

  @Prop()
  cancel?: string;
}

export const ButtonTextsSchema = SchemaFactory.createForClass(ButtonTexts);

@Schema({ _id: false })
export class ButtonVisibility {
  @Prop({ default: true })
  back?: boolean;

  @Prop({ default: true })
  next?: boolean;

  @Prop({ default: true })
  submit?: boolean;

  @Prop({ default: false })
  saveAsDraft?: boolean;

  @Prop({ default: false })
  cancel?: boolean;
}

export const ButtonVisibilitySchema = SchemaFactory.createForClass(ButtonVisibility);

@Schema({ _id: false })
export class CustomApplicationServiceStep {
  @Prop({ required: true })
  index!: number;

  @Prop({ required: true })
  letter!: string;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: ButtonTextsSchema })
  buttonTexts?: ButtonTexts;

  @Prop({ type: ButtonVisibilitySchema })
  buttonVisibility?: ButtonVisibility;
}

export const CustomApplicationServiceStepSchema = SchemaFactory.createForClass(CustomApplicationServiceStep);

@Schema({
  timestamps: true,
  collection: 'custom_application_services',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomApplicationService {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: 'FileText' })
  icon!: string;

  @Prop({ default: 'bg-blue-500' })
  color!: string;

  @Prop({ default: false, index: true })
  visible!: boolean;

  @Prop({ type: [CustomApplicationServiceFieldSchema], default: [] })
  formFields!: CustomApplicationServiceField[];

  @Prop({ type: [CustomApplicationServiceStepSchema], default: [] })
  formSteps!: CustomApplicationServiceStep[];

  @Prop({ type: ButtonTextsSchema })
  buttonTexts?: ButtonTexts;

  @Prop({ type: ButtonVisibilitySchema })
  buttonVisibility?: ButtonVisibility;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomApplicationServiceSchema = SchemaFactory.createForClass(CustomApplicationService);
