import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CustomApplicationFormSubmissionAdminStatus } from '../schemas/custom-application-form-submission.schema';

export class UpdateAdminStatusDto {
  @IsEnum(['pending', 'reviewing', 'rejected', 'approved'])
  adminStatus!: CustomApplicationFormSubmissionAdminStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
