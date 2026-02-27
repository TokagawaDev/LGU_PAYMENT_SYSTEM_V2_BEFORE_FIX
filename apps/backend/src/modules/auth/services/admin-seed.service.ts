import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole, AccountType, Gender } from '../schemas/user.schema';
import { environmentConfig } from '../../../config/environment';

/**
 * Seeds a default admin user if none exists.
 */
@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onModuleInit(): Promise<void> {
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const rawPassword = process.env.ADMIN_PASSWORD;
  
      if (!adminEmail || !rawPassword) {
        this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD environment variable is not set.');
        return;
      }
  
      const existingAdmin = await this.userModel
        .findOne({ email: adminEmail.toLowerCase() })
        .exec();
  
      if (existingAdmin) {
        return;
      }
  
      const saltRounds = environmentConfig.bcryptSaltRounds;
      const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);
  
      await this.userModel.create({
        accountType: AccountType.INDIVIDUAL,
        email: adminEmail.toLowerCase(),
        firstName: 'System',
        middleName: 'Admin',
        lastName: 'User',
        gender: Gender.MALE,
        contact: '+630000000000',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        permissions: [],
        allowedServices: [],
        isActive: true,
        isEmailVerified: true,
      });
  
      this.logger.log(`Default admin user created: ${adminEmail}`);
    } catch (error) {
      this.logger.error('Failed to seed default admin user', error as Error);
    }
  }
  
}


