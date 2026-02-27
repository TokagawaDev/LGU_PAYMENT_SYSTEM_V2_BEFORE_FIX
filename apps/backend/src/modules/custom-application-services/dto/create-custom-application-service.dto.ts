import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested, MinLength, MaxLength, Allow } from 'class-validator';
import { Type } from 'class-transformer';

const APPLICATION_FIELD_TYPES = ['text', 'number', 'email', 'password', 'date', 'file', 'select', 'radio', 'checkbox', 'textarea', 'submit', 'reset'] as const;

export class ConditionalFieldOptionDto {
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  value?: string;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}

export class ConditionalFieldDto {
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @Allow()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionalFieldOptionDto)
  options?: ConditionalFieldOptionDto[];
}

export class FieldOptionDto {
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

  @Allow()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionalFieldDto)
  conditionalFields?: ConditionalFieldDto[];
}

export class CustomApplicationServiceFieldDto {
  @IsString()
  type!: typeof APPLICATION_FIELD_TYPES[number];

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
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  stepIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  helpText?: string;

  @IsOptional()
  fieldOrder?: number;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  header?: string;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Allow()
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

export class CustomApplicationServiceStepDto {
  @IsOptional()
  index?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  letter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonTextsDto)
  buttonTexts?: ButtonTextsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonVisibilityDto)
  buttonVisibility?: ButtonVisibilityDto;
}

export class CreateCustomApplicationServiceDto {
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

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomApplicationServiceFieldDto)
  formFields?: CustomApplicationServiceFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomApplicationServiceStepDto)
  formSteps?: CustomApplicationServiceStepDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonTextsDto)
  buttonTexts?: ButtonTextsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ButtonVisibilityDto)
  buttonVisibility?: ButtonVisibilityDto;
}
