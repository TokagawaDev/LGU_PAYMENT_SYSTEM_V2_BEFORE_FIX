import { IsString, IsOptional, IsEnum, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateCustomApplicationFormSubmissionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customApplicationServiceId!: string;

  @IsOptional()
  @IsEnum(['draft', 'submitted'])
  status?: 'draft' | 'submitted';

  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}
