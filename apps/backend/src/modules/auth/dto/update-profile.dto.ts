import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: 'User first name', example: 'John', minLength: 2, maxLength: 50 })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName!: string;

  @ApiProperty({ description: 'User middle name (optional)', example: 'Paul', maxLength: 50, required: false })
  @IsString({ message: 'Middle name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Middle name must not exceed 50 characters' })
  middleName?: string;

  @ApiProperty({ description: 'User last name', example: 'Doe', minLength: 2, maxLength: 50 })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName!: string;

  @ApiProperty({ description: 'User contact number', example: '+63 912 345 6789' })
  @IsString({ message: 'Contact must be a string' })
  @IsNotEmpty({ message: 'Contact number is required' })
  contact!: string;
}


