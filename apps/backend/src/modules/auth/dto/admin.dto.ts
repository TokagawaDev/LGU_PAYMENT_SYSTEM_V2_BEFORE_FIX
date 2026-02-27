
import {
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './auth-response.dto';

/**
 * DTO for user statistics
 */
export class UserStatsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 1234,
  })
  @IsNumber()
  @Min(0)
  totalUsers!: number;

  @ApiProperty({
    description: 'Number of active users',
    example: 1200,
  })
  @IsNumber()
  @Min(0)
  activeUsers!: number;

  @ApiProperty({
    description: 'Number of inactive users',
    example: 34,
  })
  @IsNumber()
  @Min(0)
  inactiveUsers!: number;

  @ApiProperty({
    description: 'Number of new users this month',
    example: 45,
  })
  @IsNumber()
  @Min(0)
  newUsersThisMonth!: number;

  @ApiProperty({
    description: 'Growth percentage compared to last month',
    example: 12.5,
  })
  @IsNumber()
  growthPercentage!: number;

  @ApiProperty({
    description: 'Number of admin users',
    example: 3,
  })
  @IsNumber()
  @Min(0)
  adminUsers!: number;

  @ApiProperty({
    description: 'Number of regular users',
    example: 1231,
  })
  @IsNumber()
  @Min(0)
  regularUsers!: number;
}

/**
 * DTO for pagination metadata
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @IsNumber()
  @Min(1)
  currentPage!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 25,
  })
  @IsNumber()
  @Min(0)
  totalPages!: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 1234,
  })
  @IsNumber()
  @Min(0)
  totalCount!: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  @IsBoolean()
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  @IsBoolean()
  hasPreviousPage!: boolean;
}

/**
 * DTO for users list response
 */
export class UsersListDto {
  @ApiProperty({
    description: 'Array of users',
    type: [UserResponseDto],
  })
  users!: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination!: PaginationDto;
}
