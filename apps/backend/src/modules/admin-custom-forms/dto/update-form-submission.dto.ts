import { IsOptional, IsEnum, IsObject } from 'class-validator';

export class UpdateFormSubmissionDto {
  @IsOptional()
  @IsEnum(['draft', 'submitted'])
  status?: 'draft' | 'submitted';

  @IsOptional()
  @IsObject()
  formData?: Record<string, unknown>;
}
