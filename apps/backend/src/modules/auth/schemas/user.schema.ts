import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum AccountType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    type: String,
    enum: AccountType,
    default: AccountType.INDIVIDUAL,
  })
  accountType!: AccountType;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true,
  })
  firstName!: string;

  @Prop({
    maxlength: 50,
    trim: true,
  })
  middleName?: string;

  @Prop({
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true,
  })
  lastName!: string;

  @Prop({
    type: String,
    enum: Gender,
    required: true,
  })
  gender!: Gender;

  @Prop({
    required: true,
    trim: true,
  })
  contact!: string;

  @Prop({
    required: true,
    minlength: 60, // bcrypt hash length
  })
  password!: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Prop({
    type: [String],
    default: [],
  })
  permissions!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  allowedServices!: string[];

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    default: false,
  })
  isEmailVerified!: boolean;

  // Virtual fields for full name
  get fullName(): string {
    const middle = this.middleName ? ` ${this.middleName}` : '';
    return `${this.firstName}${middle} ${this.lastName}`;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add virtual field
UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.password;
    delete obj.__v;
    return obj;
  },
});