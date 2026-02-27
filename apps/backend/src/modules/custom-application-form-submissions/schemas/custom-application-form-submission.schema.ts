import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomApplicationFormSubmissionDocument = CustomApplicationFormSubmission & Document;

export type CustomApplicationFormSubmissionStatus = 'draft' | 'submitted';
export type CustomApplicationFormSubmissionAdminStatus = 'pending' | 'reviewing' | 'rejected' | 'approved';

@Schema({
  timestamps: true,
  collection: 'custom_application_form_submissions',
})
export class CustomApplicationFormSubmission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  customApplicationServiceId!: string;

  @Prop({
    type: String,
    enum: ['draft', 'submitted'],
    default: 'draft',
    index: true,
  })
  status!: CustomApplicationFormSubmissionStatus;

  @Prop({
    type: String,
    enum: ['pending', 'reviewing', 'rejected', 'approved'],
    index: true,
  })
  adminStatus?: CustomApplicationFormSubmissionAdminStatus;

  @Prop({ type: Object, default: {} })
  formData!: Record<string, unknown>;

  @Prop({ type: String })
  adminNotes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomApplicationFormSubmissionSchema =
  SchemaFactory.createForClass(CustomApplicationFormSubmission);

// Compound indexes for efficient queries
CustomApplicationFormSubmissionSchema.index({ userId: 1, customApplicationServiceId: 1, status: 1 });
CustomApplicationFormSubmissionSchema.index({ userId: 1, updatedAt: -1 });
// Index for Application ID lookups (MongoDB _id is already unique and indexed by default)
CustomApplicationFormSubmissionSchema.index({ customApplicationServiceId: 1, updatedAt: -1 });
