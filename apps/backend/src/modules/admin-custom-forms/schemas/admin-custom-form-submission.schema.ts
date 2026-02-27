import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminCustomFormSubmissionDocument = AdminCustomFormSubmission & Document;

@Schema({
  timestamps: true,
  collection: 'admin_custom_form_submissions',
})
export class AdminCustomFormSubmission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AdminCustomForm', required: true, index: true })
  adminFormId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['draft', 'submitted'],
    default: 'draft',
    index: true,
  })
  status!: 'draft' | 'submitted';

  @Prop({ type: Object, default: {} })
  formData!: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AdminCustomFormSubmissionSchema = SchemaFactory.createForClass(
  AdminCustomFormSubmission,
);
AdminCustomFormSubmissionSchema.index({ userId: 1, adminFormId: 1, status: 1 });
AdminCustomFormSubmissionSchema.index({ userId: 1, updatedAt: -1 });
