import { normalizeToServiceId } from '@shared/constants/services';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { User, UserDocument, UserRole, AccountType, Gender } from './schemas/user.schema';
import {
  UserStatsDto,
  UsersListDto,
  UserResponseDto,
} from './dto';
import { calculateGrowth } from '../utils/calculate-growth.util';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

type UserDocWithTimestamps = UserDocument & { createdAt: Date; updatedAt: Date };

interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  accountType?: AccountType;
}

/**
 * Admin service for user management operations
 * Handles CRUD operations and statistics for users
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private normalizeServiceId(raw: string): string {
    return normalizeToServiceId(raw) ?? raw;
  }

  private normalizeAllowedServices(values?: string[]): string[] {
    if (!Array.isArray(values)) return [];
    const unique = Array.from(new Set(values.map((s) => this.normalizeServiceId(s))));
    return unique;
  }

  private normalizePermissions(values?: string[]): string[] {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map((s) => (s || '').trim())));
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStats(): Promise<UserStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
    );
    const prevMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0),
    );
    const prevMonthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59),
    );

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      adminUsers,
      regularUsers,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: startOfMonth } })
        .exec(),
      this.userModel
        .countDocuments({
          createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
        })
        .exec(),
      this.userModel.countDocuments({ role: UserRole.ADMIN }).exec(),
      this.userModel.countDocuments({ role: UserRole.USER }).exec(),
    ]);

    // Calculate growth percentage (aligned with transactions: calendar month, UTC)
    const growthPercentage = calculateGrowth(newUsersThisMonth, newUsersLastMonth);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      newUsersThisMonth,
      growthPercentage,
      adminUsers,
      regularUsers,
    };
  }

  /**
   * Get paginated list of users with optional filtering
   */
  async getUsers(params: GetUsersParams): Promise<UsersListDto> {
    const { page, limit, search, accountType } = params;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: FilterQuery<UserDocument> = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Always hide admin accounts from list
    filter.role = UserRole.USER;

    if (accountType) {
      filter.accountType = accountType;
    }

    const [users, totalCount] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password') // Exclude password field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      users: users.map((doc) => this.mapUserToResponseDto(doc as unknown as UserDocWithTimestamps)),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToResponseDto(user as unknown as UserDocWithTimestamps);
  }



  /**
   * Map user document to response DTO
   */
  private mapUserToResponseDto(user: UserDocWithTimestamps): UserResponseDto {
    return {
      _id: (user._id as string).toString(),
      accountType: user.accountType,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      fullName: user.fullName,
      gender: user.gender,
      contact: user.contact,
      role: user.role,
      permissions: (user as unknown as { permissions?: string[] }).permissions ?? [],
      allowedServices: (user as unknown as { allowedServices?: string[] }).allowedServices ?? [],
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ===== Admin accounts (role === admin) management, restricted to super admin via controller roles =====
  async listAdmins(params: { page: number; limit: number; search?: string }): Promise<{ admins: UserResponseDto[]; pagination: { currentPage: number; totalPages: number; totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;
    const filter: FilterQuery<UserDocument> = { role: UserRole.ADMIN };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const [admins, totalCount] = await Promise.all([
      this.userModel.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    const totalPages = Math.ceil(totalCount / limit) || 1;
    return {
      admins: admins.map((doc) => this.mapUserToResponseDto(doc as unknown as UserDocWithTimestamps)),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getAdminById(id: string): Promise<UserResponseDto> {
    const admin = await this.userModel.findById(id).select('-password').exec();
    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new NotFoundException('Admin not found');
    }
    return this.mapUserToResponseDto(admin as unknown as UserDocWithTimestamps);
  }

  async createAdmin(dto: CreateAdminDto): Promise<UserResponseDto> {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (exists) {
      throw new ConflictException('Email already in use');
    }
    const hashed = await bcrypt.hash(dto.password, 12);
    const admin = new this.userModel({
      accountType: AccountType.INDIVIDUAL,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName.trim(),
      middleName: dto.middleName?.trim(),
      lastName: dto.lastName.trim(),
      gender: (dto.gender as Gender),
      contact: dto.contact.trim(),
      password: hashed,
      role: UserRole.ADMIN,
      permissions: this.normalizePermissions(dto.permissions),
      allowedServices: this.normalizeAllowedServices(dto.allowedServices),
      isActive: dto.isActive ?? true,
      isEmailVerified: true,
    });
    const saved = await admin.save();
    return this.mapUserToResponseDto(saved as unknown as UserDocWithTimestamps);
  }

  async updateAdmin(id: string, dto: UpdateAdminDto): Promise<UserResponseDto> {
    const admin = await this.userModel.findById(id).select('+password').exec();
    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new NotFoundException('Admin not found');
    }
    if (dto.email && dto.email.toLowerCase() !== admin.email.toLowerCase()) {
      const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
      if (exists) throw new ConflictException('Email already in use');
      admin.email = dto.email.toLowerCase();
    }
    if (typeof dto.firstName === 'string') admin.firstName = dto.firstName.trim();
    if (typeof dto.middleName === 'string') admin.middleName = dto.middleName.trim();
    if (typeof dto.lastName === 'string') admin.lastName = dto.lastName.trim();
    if (typeof dto.gender === 'string') admin.gender = dto.gender as Gender;
    if (typeof dto.contact === 'string') admin.contact = dto.contact.trim();
    if (Array.isArray(dto.permissions)) admin.permissions = this.normalizePermissions(dto.permissions);
    if (Array.isArray(dto.allowedServices)) admin.allowedServices = this.normalizeAllowedServices(dto.allowedServices);
    if (typeof dto.isActive === 'boolean') admin.isActive = dto.isActive;
    if (dto.password) {
      if (dto.password.length < 8) throw new BadRequestException('Password too short');
      admin.password = await bcrypt.hash(dto.password, 12);
    }
    const saved = await admin.save();
    return this.mapUserToResponseDto(saved as unknown as UserDocWithTimestamps);
  }

  async deleteAdmin(id: string): Promise<void> {
    const admin = await this.userModel.findById(id).exec();
    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new NotFoundException('Admin not found');
    }
    if (admin.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin');
    }
    await this.userModel.findByIdAndDelete(id).exec();
  }
}
