import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min, ValidateNested, IsEnum } from 'class-validator';
import { BreakdownCode } from '../../transactions/dto/create-transaction.dto';

export class BreakdownItemInputDto {
  @ApiProperty({ enum: BreakdownCode })
  @IsEnum(BreakdownCode)
  code!: BreakdownCode;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ description: 'Minor units (centavos). Discounts can be negative.' })
  @IsInt()
  amountMinor!: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class InitiatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serviceName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ type: [BreakdownItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakdownItemInputDto)
  breakdown!: BreakdownItemInputDto[];

  @ApiProperty({ description: 'Total amount in minor units (centavos). Must equal sum of breakdown.' })
  @IsInt()
  @Min(0)
  totalAmountMinor!: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  formData?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: ['card', 'digital-wallets', 'dob', 'qrph'] })
  @IsOptional()
  @IsIn(['card', 'digital-wallets', 'dob', 'qrph'])
  paymentMethod?: 'card' | 'digital-wallets' | 'dob' | 'qrph';

  @ApiProperty()
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}


