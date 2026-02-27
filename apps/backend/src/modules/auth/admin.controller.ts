import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Query,
  Param,
  Post,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole, AccountType } from './schemas/user.schema';
import { AdminService } from './admin.service';
import { UserStatsDto, UsersListDto } from './dto';
import { Types } from 'mongoose';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

/**
 * Admin controller for user management operations
 * Only accessible by admin users
 */
@ApiTags('Admin - User Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Retrieve user statistics including total users, active users, and growth metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User statistics retrieved successfully',
    type: UserStatsDto,
  })
  async getUserStats(): Promise<UserStatsDto> {
    return this.adminService.getUserStats();
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a paginated list of all users with optional search and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
  })
  // Removed role and status filters from public API; we filter internally to exclude admins
  @ApiQuery({
    name: 'accountType',
    required: false,
    enum: AccountType,
    description: 'Filter by account type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users list retrieved successfully',
    type: UsersListDto,
  })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('accountType') accountType?: AccountType,
  ): Promise<UsersListDto> {
    const validatedLimit = Math.min(Math.max(limit, 1), 100);
    const validatedPage = Math.max(page, 1);

    return this.adminService.getUsers({
      page: validatedPage,
      limit: validatedLimit,
      search,
      // role and isActive removed from public filters; enforce user role in service
      accountType,
    });
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve detailed information about a specific user',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User details retrieved successfully',
  })
  async getUserById(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid user ID format');
    }
    return this.adminService.getUserById(id);
  }

  // ===== Admin accounts management (Super Admin only) =====
  @Get('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List admin accounts' })
  async listAdmins(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const validatedLimit = Math.min(Math.max(limit, 1), 100);
    const validatedPage = Math.max(page, 1);
    return this.adminService.listAdmins({ page: validatedPage, limit: validatedLimit, search });
  }

  @Get('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an admin account' })
  async getAdmin(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid admin ID format');
    }
    return this.adminService.getAdminById(id);
  }

  @Post('admins')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new admin account' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Patch('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an admin account' })
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid admin ID format');
    }
    return this.adminService.updateAdmin(id, dto);
  }

  @Delete('admins/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an admin account' })
  async deleteAdmin(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid admin ID format');
    }
    await this.adminService.deleteAdmin(id);
    return { message: 'Deleted' };
  }
}
