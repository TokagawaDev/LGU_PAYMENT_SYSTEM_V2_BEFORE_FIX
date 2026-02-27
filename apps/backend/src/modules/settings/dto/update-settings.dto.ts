import { Allow, IsEmail, IsIn, IsOptional, IsString, ValidateNested, IsArray, MinLength, MaxLength, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ServiceId } from '@shared/constants/services';

const ADDON_FIELD_TYPES = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;
const PAYMENT_FIELD_TYPES = ['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'date', 'cost', 'password', 'radio', 'checkbox'] as const;

export class AddOnFormFieldOptionDto {
  @IsString()
  value!: string;
  @IsString()
  label!: string;
}

export class AddOnFormFieldDto {
  @IsIn(ADDON_FIELD_TYPES as unknown as string[])
  type!: typeof ADDON_FIELD_TYPES[number];

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnFormFieldOptionDto)
  options?: AddOnFormFieldOptionDto[];

  @IsOptional()
  @IsNumber()
  stepIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  helpText?: string;

  @IsOptional()
  @IsNumber()
  fieldOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  header?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reminder?: string;
}

export class ButtonTextsDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  back?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  next?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  submit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  saveAsDraft?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cancel?: string;
}

export class ButtonVisibilityDto {
  @IsOptional()
  @IsBoolean()
  back?: boolean;

  @IsOptional()
  @IsBoolean()
  next?: boolean;

  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;

  @IsOptional()
  @IsBoolean()
  cancel?: boolean;
}

export class AddOnFormStepDto {
  @IsOptional()
  @IsNumber()
  index!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  letter!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonTextsDto)
  buttonTexts?: ButtonTextsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonVisibilityDto)
  buttonVisibility?: ButtonVisibilityDto;
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

  @IsIn(PAYMENT_FIELD_TYPES as unknown as string[])
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
  @Type(() => AddOnFormFieldOptionDto)
  options?: AddOnFormFieldOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentFormFieldValidationDto)
  validation?: PaymentFormFieldValidationDto;
}

export class CustomPaymentServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsNumber()
  @IsOptional()
  baseAmount?: number;

  @IsNumber()
  @IsOptional()
  processingFee?: number;

  @Allow() // Whitelist for global ValidationPipe (forbidNonWhitelisted)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value === undefined ? undefined : Boolean(value);
  })
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentFormFieldDto)
  formFields?: PaymentFormFieldDto[];
}

export class AddOnServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @Allow() // Whitelist for global ValidationPipe (forbidNonWhitelisted)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value === undefined ? undefined : Boolean(value);
  })
  @IsBoolean()
  visible?: boolean; // Controls visibility in citizen portal (default hidden)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnFormFieldDto)
  formFields?: AddOnFormFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnFormStepDto)
  formSteps?: AddOnFormStepDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonTextsDto)
  buttonTexts?: ButtonTextsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonVisibilityDto)
  buttonVisibility?: ButtonVisibilityDto;
}

export class CityDto {
  @IsString()
  name!: string;

  @IsString()
  fullName!: string;
}

export class BrandingDto {
  @IsString()
  systemName!: string;

  @IsString()
  systemDescription!: string;
}

export class AssetsDto {
  @IsString()
  headerBackgroundUrl!: string;

  @IsString()
  sealLogoUrl!: string;

  @IsString()
  faviconUrl!: string;
}

export class ContactDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  address!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  phone!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  website!: string;
}

export class FAQItemDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsIn(['general', 'payment', 'technical', 'account'])
  category!: 'general' | 'payment' | 'technical' | 'account';
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CityDto)
  city?: CityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssetsDto)
  assets?: AssetsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FAQItemDto)
  faq?: FAQItemDto[];

  @IsOptional()
  enabledServices?: Record<ServiceId, boolean>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddOnServiceDto)
  addOnServices?: AddOnServiceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPaymentServiceDto)
  customPaymentServices?: CustomPaymentServiceDto[];
}


