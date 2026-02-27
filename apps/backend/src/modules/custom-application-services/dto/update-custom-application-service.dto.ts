import { IsString, IsBoolean, IsArray, IsOptional, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomApplicationServiceFieldDto, ButtonTextsDto, ButtonVisibilityDto, CustomApplicationServiceStepDto } from './create-custom-application-service.dto';

export class UpdateCustomApplicationServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

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
