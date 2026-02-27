import { ApiProperty } from '@nestjs/swagger';
import { UserRole, AccountType, Gender } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id!: string;

  @ApiProperty({
    description: 'Account type',
    enum: AccountType,
    example: AccountType.INDIVIDUAL,
  })
  accountType!: AccountType;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'User middle name',
    example: 'Michael',
    required: false,
  })
  middleName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Michael Doe',
  })
  fullName!: string;

  @ApiProperty({
    description: 'User gender',
    enum: Gender,
    example: Gender.MALE,
  })
  gender!: Gender;

  @ApiProperty({
    description: 'User contact number',
    example: '+1234567890',
  })
  contact!: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Assigned permissions',
    type: [String],
    required: false,
    example: ['view_business_permit'],
  })
  permissions?: string[];

  @ApiProperty({
    description: 'Allowed service IDs for restricted admins',
    type: [String],
    required: false,
    example: ['business_permit'],
  })
  allowedServices?: string[];

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: false,
  })
  isEmailVerified!: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Account last update date',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User registered successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'User data',
    type: UserResponseDto,
  })
  user!: UserResponseDto;
}