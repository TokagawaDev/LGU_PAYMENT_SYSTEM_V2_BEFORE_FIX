import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsEnum, IsOptional } from 'class-validator';
import { AccountType, Gender } from '../schemas/user.schema';

export class RegisterDto {
  @ApiProperty({
    description: 'Account type',
    enum: AccountType,
    example: AccountType.INDIVIDUAL,
  })
  @IsEnum(AccountType, { message: 'Account type must be either individual or business' })
  @IsNotEmpty({ message: 'Account type is required' })
  accountType!: AccountType;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName!: string;

  @ApiProperty({
    description: 'User middle name (optional)',
    example: 'Michael',
    maxLength: 50,
    required: false,
  })
  @IsString({ message: 'Middle name must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Middle name must not exceed 50 characters' })
  middleName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName!: string;

  @ApiProperty({
    description: 'User gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender, { message: 'Gender must be either male or female' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender!: Gender;

  @ApiProperty({
    description: 'User contact number',
    example: '+1234567890',
  })
  @IsString({ message: 'Contact must be a string' })
  @IsNotEmpty({ message: 'Contact number is required' })
  contact!: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }
  )
  password!: string;
}