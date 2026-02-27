import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthJwtService } from './services/jwt.service';
import { EmailService } from './services/email.service';
import { User, UserSchema } from './schemas/user.schema';
import { VerificationCode, VerificationCodeSchema } from './schemas/verification-code.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AdminSeedService } from './services/admin-seed.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VerificationCode.name, schema: VerificationCodeSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // Base configuration - secrets will be provided via environment variables
      signOptions: { expiresIn: '15m' },
    }),
    SettingsModule,
  ],
  controllers: [AuthController, AdminController],
  providers: [
    AuthService,
    AdminService,
    AuthJwtService,
    EmailService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    PermissionsGuard,
    AdminSeedService,
  ],
  exports: [
    AuthService,
    AuthJwtService,
    EmailService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PassportModule,
  ],
})
export class AuthModule {}