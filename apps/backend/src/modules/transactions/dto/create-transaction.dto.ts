import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ServiceId } from '@shared/constants/services';

export enum BreakdownCode {
  BASE = 'base',
  TAX = 'tax',
  CONVENIENCE_FEE = 'convenience_fee',
  PROCESSING_FEE = 'processing_fee',
  DISCOUNT = 'discount',
  OTHER = 'other',
}

export enum TransactionStatusDtoEnum {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PAID = 'paid',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

export enum PaymentChannelEnum {
  ONLINE_WALLET = 'online_wallet',
  ONLINE_BANKING = 'online_banking',
  QRPH = 'qrph',
  CARD = 'card',
  OTHER = 'other',
}

export class ServiceSnapshotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceId!: ServiceId;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  otherInfo?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;
}

export class BreakdownItemDto {
  @ApiProperty({ enum: BreakdownCode })
  @IsEnum(BreakdownCode)
  code!: BreakdownCode;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ description: 'Minor units (centavos). Discounts may be negative.' })
  @IsInt()
  amountMinor!: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class TransactionDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @ApiProperty({ type: [BreakdownItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakdownItemDto)
  breakdown!: BreakdownItemDto[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  formData?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentProviderInfoDto {
  @ApiProperty({ enum: PaymentChannelEnum })
  @IsEnum(PaymentChannelEnum)
  channel!: PaymentChannelEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subchannel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  providerStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiProperty({ required: false, description: 'Provider fee in minor units'})
  @IsOptional()
  @IsInt()
  feeMinor?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  raw?: Record<string, unknown>;
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Business date for the transaction (ISO UTC)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ type: ServiceSnapshotDto })
  @ValidateNested()
  @Type(() => ServiceSnapshotDto)
  service!: ServiceSnapshotDto;

  @ApiProperty({ description: 'Total amount in minor units (centavos). Must equal sum of breakdown.' })
  @IsInt()
  @Min(0)
  totalAmountMinor!: number;

  @ApiProperty({ type: TransactionDetailsDto })
  @ValidateNested()
  @Type(() => TransactionDetailsDto)
  details!: TransactionDetailsDto;

  @ApiProperty({ enum: TransactionStatusDtoEnum, required: false })
  @IsOptional()
  @IsEnum(TransactionStatusDtoEnum)
  status?: TransactionStatusDtoEnum;

  @ApiProperty({ type: PaymentProviderInfoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentProviderInfoDto)
  payment?: PaymentProviderInfoDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userEmail?: string;
}


