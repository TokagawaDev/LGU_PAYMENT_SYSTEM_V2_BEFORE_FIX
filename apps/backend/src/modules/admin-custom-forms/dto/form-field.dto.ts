import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const FIELD_TYPES = [
  'text',
  'number',
  'email',
  'password',
  'date',
  'file',
  'select',
  'radio',
  'checkbox',
  'textarea',
  'submit',
  'reset',
] as const;

export class FormFieldValidationDto {
  @IsOptional()
  @IsNumber()
  min?: number;
  @IsOptional()
  @IsNumber()
  max?: number;
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pattern?: string;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}

export class FormFieldOptionDto {
  @IsString()
  value!: string;
  @IsString()
  label!: string;
}

export class FormFieldDto {
  @IsIn(FIELD_TYPES as unknown as string[])
  type!: (typeof FIELD_TYPES)[number];
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
  @Type(() => FormFieldOptionDto)
  options?: FormFieldOptionDto[];
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FormFieldValidationDto)
  validation?: FormFieldValidationDto;
}
