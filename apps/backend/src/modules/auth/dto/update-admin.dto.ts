import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { Gender } from '../schemas/user.schema';

export class UpdateAdminDto {
  @ApiProperty({ example: 'admin@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Ada', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'L.', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @ApiProperty({ example: 'Lovelace', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsString()
  gender?: Gender;

  @ApiProperty({ example: '09XXXXXXXXX', required: false })
  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^09\d{9}$/)
  contact?: string;

  @ApiProperty({ minLength: 8, required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedServices?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


