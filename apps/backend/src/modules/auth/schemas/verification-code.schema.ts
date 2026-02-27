import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VerificationCodeDocument = VerificationCode & Document;

@Schema({
  timestamps: true,
  collection: 'verification_codes',
})
export class VerificationCode {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    length: 6,
  })
  code!: string;

  @Prop({
    required: true,
    default: Date.now,
    expires: 10 * 60, // 10 minutes in seconds
  })
  expiresAt!: Date;

  @Prop({
    default: false,
  })
  isUsed!: boolean;

  @Prop({
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification',
  })
  type!: string;
}

export const VerificationCodeSchema = SchemaFactory.createForClass(VerificationCode);

// Create TTL index for automatic expiration
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
