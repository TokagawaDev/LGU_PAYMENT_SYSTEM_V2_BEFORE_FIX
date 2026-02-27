import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, ValidateNested, MinLength, MaxLength, Min, Allow } from 'class-validator';
import { Type } from 'class-transformer';

const PAYMENT_FIELD_TYPES = ['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'date', 'cost', 'password', 'radio', 'checkbox'] as const;

export class PaymentFieldOptionDto {
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  value?: string;

  @Allow()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;
}

export class PaymentFormFieldValidationDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pattern?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  message?: string;
}

export class PaymentFormFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  type!: typeof PAYMENT_FIELD_TYPES[number];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reminder?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentFieldOptionDto)
  options?: PaymentFieldOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentFormFieldValidationDto)
  validation?: PaymentFormFieldValidationDto;
}

export class CreateCustomPaymentServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsNumber()
  @Min(0)
  baseAmount!: number;

  @IsNumber()
  @Min(0)
  processingFee!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentFormFieldDto)
  formFields?: PaymentFormFieldDto[];
}
