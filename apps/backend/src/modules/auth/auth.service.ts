import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { VerificationCode, VerificationCodeDocument } from './schemas/verification-code.schema';
import { RegisterDto, LoginDto, UserResponseDto, UpdateProfileDto, ChangePasswordDto, VerifyEmailDto, ResendVerificationDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { AuthJwtService, TokenPair } from './services/jwt.service';
import { EmailService } from './services/email.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(VerificationCode.name) private verificationCodeModel: Model<VerificationCodeDocument>,
    private readonly jwtService: AuthJwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user
   * @param registerDto Registration data
   * @returns Created user data
   */
  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const { 
      accountType, 
      email, 
      firstName, 
      middleName, 
      lastName, 
      gender, 
      contact, 
      password 
    } = registerDto;

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create new user (initially unverified)
    const newUser = new this.userModel({
      accountType,
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      gender,
      contact: contact.trim(),
      password: hashedPassword,
      isEmailVerified: false, // Ensure user starts as unverified
    });

    try {
      const savedUser = await newUser.save();
      
      // Generate and send verification code
      await this.generateAndSendVerificationCode(savedUser._id as Types.ObjectId, email, firstName);
      
      return this.transformUserToResponse(savedUser);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }
      throw new BadRequestException('Failed to create user account');
    }
  }

  /**
   * Login user (only if email is verified)
   * @param loginDto Login credentials
   * @returns User data if login successful
   */
  async login(loginDto: LoginDto): Promise<UserResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Please contact support');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.transformUserToResponse(user);
  }

  /**
   * Find user by email
   * @param email User email
   * @returns User document or null
   */
  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
  }

  /**
   * Find user by ID
   * @param id User ID
   * @returns User document or null
   */
  async findUserById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * Update profile fields for a user
   * @param userId User ID
   * @param updateProfileDto Profile fields to update
   * @returns Updated user response
   */
  async updateUserProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { firstName, middleName, lastName, contact } = updateProfileDto;
    user.firstName = firstName.trim();
    user.middleName = middleName?.trim();
    user.lastName = lastName.trim();
    user.contact = contact.trim();
    const saved = await user.save();
    return this.transformUserToResponse(saved);
  }

  /**
   * Change user password after verifying current password
   * @param userId User ID
   * @param changePasswordDto New and current passwords
   */
  async changeUserPassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { currentPassword, newPassword } = changePasswordDto;
    const isCurrentValid = await this.verifyPassword(currentPassword, user.password);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashed = await this.hashPassword(newPassword);
    user.password = hashed;
    await user.save();
  }

  /**
   * Hash password using bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   * @param password Plain text password
   * @param hashedPassword Hashed password from database
   * @returns True if password matches
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Transform user document to response DTO
   * @param user User document
   * @returns User response DTO
   */
  transformUserToResponse(user: UserDocument): UserResponseDto {
    return {
      _id: (user._id as Types.ObjectId).toString(),
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
      createdAt: (user as UserDocument & { createdAt: Date }).createdAt,
      updatedAt: (user as UserDocument & { updatedAt: Date }).updatedAt,
    };
  }

  /**
   * Update user's last login timestamp
   * @param userId User ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { lastLoginAt: new Date() })
      .exec();
  }

  /**
   * Check if email is already taken
   * @param email Email to check
   * @returns True if email exists
   */
  async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    return !!user;
  }

  /**
   * Check user verification status
   * @param email Email to check
   * @returns User verification status or null if user doesn't exist
   */
  async getUserVerificationStatus(email: string): Promise<{ isVerified: boolean; isActive: boolean } | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }
    return {
      isVerified: user.isEmailVerified,
      isActive: user.isActive,
    };
  }

  /**
   * Validate user credentials for Passport local strategy
   * @param email User email
   * @param password Plain text password
   * @returns User document if valid, null if invalid
   */
  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Login user with JWT tokens
   * @param user User document
   * @returns Tokens and user data
   */
  async loginWithTokens(user: UserDocument): Promise<{ tokens: TokenPair; user: UserResponseDto }> {
    const tokens = this.jwtService.generateTokens(user);
    const userResponse = this.transformUserToResponse(user);
    
    // Update last login timestamp
    await this.updateLastLogin((user._id as Types.ObjectId).toString());
    
    return {
      tokens,
      user: userResponse,
    };
  }

  /**
   * Refresh access token
   * @param refreshToken Refresh token
   * @returns New access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const accessToken = this.jwtService.refreshAccessToken(refreshToken);
    return { accessToken };
  }

  /**
   * Validate JWT token and get user
   * @param token JWT token
   * @returns User document if valid
   */
  async validateToken(token: string): Promise<UserDocument> {
    const payload = this.jwtService.verifyAccessToken(token);
    const user = await this.findUserById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    
    return user;
  }

  /**
   * Generate and send verification code
   * @param userId User ID
   * @param email User email
   * @param userName User's first name
   */
  async generateAndSendVerificationCode(userId: Types.ObjectId, email: string, userName: string): Promise<void> {
    // Delete any existing verification codes for this user
    await this.verificationCodeModel.deleteMany({ 
      userId, 
      type: 'email_verification' 
    });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create verification code record
    const verificationCode = new this.verificationCodeModel({
      userId,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      type: 'email_verification',
    });

    await verificationCode.save();

    // Send verification email
    await this.emailService.sendVerificationEmail(email, code, userName);
  }

  /**
   * Verify email with code
   * @param verifyEmailDto Verification data
   * @returns Success message
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { email, code } = verifyEmailDto;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Find verification code
    const verificationCode = await this.verificationCodeModel.findOne({
      userId: user._id,
      code,
      type: 'email_verification',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark code as used
    verificationCode.isUsed = true;
    await verificationCode.save();

    // Mark user as verified
    user.isEmailVerified = true;
    await user.save();

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Resend verification code
   * @param resendVerificationDto Resend data
   * @returns Success message
   */
  async resendVerificationCode(resendVerificationDto: ResendVerificationDto): Promise<{ message: string }> {
    const { email } = resendVerificationDto;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate and send new verification code
    await this.generateAndSendVerificationCode(user._id as Types.ObjectId, email, user.firstName);

    return { message: 'Verification code sent successfully' };
  }

  /**
   * Generate and send password reset code
   * @param forgotPasswordDto Forgot password data
   * @returns Success message
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }

    // Check if user is active
    if (!user.isActive) {
      return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }

    // Generate and send password reset code
    await this.generateAndSendPasswordResetCode(user._id as Types.ObjectId, email, user.firstName);

    return { message: 'If an account with that email exists, a password reset code has been sent.' };
  }

  /**
   * Generate and send password reset code
   * @param userId User ID
   * @param email User email
   * @param userName User's first name
   */
  async generateAndSendPasswordResetCode(userId: Types.ObjectId, email: string, userName: string): Promise<void> {
    // Delete any existing password reset codes for this user
    await this.verificationCodeModel.deleteMany({ 
      userId, 
      type: 'password_reset' 
    });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create verification code record
    const verificationCode = new this.verificationCodeModel({
      userId,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      type: 'password_reset',
    });

    await verificationCode.save();

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, code, userName);
  }

  /**
   * Reset password with verification code
   * @param resetPasswordDto Reset password data
   * @returns Success message
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = resetPasswordDto;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new BadRequestException('Account is deactivated. Please contact support');
    }

    // Find verification code
    const verificationCode = await this.verificationCodeModel.findOne({
      userId: user._id,
      code,
      type: 'password_reset',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark code as used
    verificationCode.isUsed = true;
    await verificationCode.save();

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }
}