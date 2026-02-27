import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Res,
  Req,
  Get,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto, UpdateProfileDto, ChangePasswordDto, VerifyEmailDto, ResendVerificationDto } from './dto';
import { Types } from 'mongoose';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Build consistent cookie options for auth cookies across endpoints
   */
  private buildAuthCookieOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;
    const baseOptions: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'strict') as CookieOptions['sameSite'],
      path: '/',
    };

    if (isProduction && cookieDomain) {
      baseOptions.domain = cookieDomain;
    }

    return baseOptions;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email, password, and personal information. A verification code will be sent to the email.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered. Check email for verification code.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Email must be a valid email address', 'Password is too weak'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.authService.register(registerDto);
    return {
      message: 'User registered successfully. Please check your email for verification code.',
      user,
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using the 6-digit code sent to email',
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Email verification data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully. You can now log in.' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification code, or email already verified',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification code',
    description: 'Resend email verification code to user email address',
  })
  @ApiBody({
    type: ResendVerificationDto,
    description: 'Email address for resending verification',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification code sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Verification code sent successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email already verified',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto): Promise<{ message: string }> {
    return this.authService.resendVerificationCode(resendVerificationDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password. Tokens are set via HTTP-only cookies.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in. Tokens are set via HTTP-only cookies.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login successful' },
        user: { $ref: '#/components/schemas/UserResponseDto' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['Email must be a valid email address', 'Password is required'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account deactivated',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid email or password' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async login(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    // Only allow user role here; return generic error on mismatch
    if (user.role !== 'user') {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { tokens, user: userResponse } = await this.authService.loginWithTokens(user);

    // Set secure HTTP-only cookies for tokens with unified options
    const cookieOptions = this.buildAuthCookieOptions();

    response.cookie('access-token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    response.cookie('refresh-token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // No non-HTTP-only role cookie; frontend must validate via verify-token
    
    // Return message and user only; tokens are stored in HTTP-only cookies
    return {
      message: 'Login successful',
      user: userResponse,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin users only with email and password. Tokens are set via HTTP-only cookies.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Admin login credentials',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin successfully logged in. Tokens are set via HTTP-only cookies.',
  })
  async adminLogin(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      // Generic message to avoid leaking role info
      throw new UnauthorizedException('Invalid email or password');
    }
    const { tokens, user: userResponse } = await this.authService.loginWithTokens(user);

    // Set secure HTTP-only cookies for tokens with unified options
    const cookieOptions = this.buildAuthCookieOptions();

    response.cookie('access-token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    response.cookie('refresh-token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // No readable role cookie; frontend must validate via verify-token

    return {
      message: 'Admin login successful',
      user: userResponse,
    };
  }

  @Public()
  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if email is available',
    description: 'Check if an email address is already registered',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email availability status',
    schema: {
      type: 'object',
      properties: {
        available: {
          type: 'boolean',
          example: true,
          description: 'True if email is available, false if taken',
        },
        message: {
          type: 'string',
          example: 'Email is available',
        },
      },
    },
  })
  async checkEmailAvailability(@Body('email') email: string) {
    const isTaken = await this.authService.isEmailTaken(email);
    return {
      available: !isTaken,
      message: isTaken ? 'Email is already registered' : 'Email is available',
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate a new access token using the HTTP-only refresh token cookie. New token is set via HTTP-only cookie.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Access token refreshed and set via HTTP-only cookie',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Access token refreshed' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.['refresh-token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const { accessToken } = await this.authService.refreshToken(refreshToken);

    // Set new access token cookie with unified options (prevents duplicate host-only/domain cookies)
    const cookieOptions = this.buildAuthCookieOptions();
    response.cookie('access-token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return { message: 'Access token refreshed' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clear authentication tokens and logout user',
  })
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear authentication cookies (both host-only and domain cookies if present)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    // Always clear host-only cookies
    response.clearCookie('access-token', { path: '/' });
    response.clearCookie('refresh-token', { path: '/' });

    // Also clear domain cookies when configured (helps prevent duplicated cookies)
    if (isProduction && cookieDomain) {
      const baseClear: CookieOptions = {
        path: '/',
        domain: cookieDomain,
        secure: isProduction,
        sameSite: (isProduction ? 'none' : 'strict') as CookieOptions['sameSite'],
      };
      response.clearCookie('access-token', baseClear);
      response.clearCookie('refresh-token', baseClear);
    }

    return { message: 'Logout successful' };
  }

  @Get('verify-token')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Verify authentication token',
    description: 'Validate current authentication token and return user info',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        user: { $ref: '#/components/schemas/UserResponseDto' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
  })
  async verifyToken(@CurrentUser() user: UserDocument) {
    const userResponse = this.authService.transformUserToResponse(user);
    return {
      valid: true,
      user: userResponse,
    };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get current authenticated user profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: { $ref: '#/components/schemas/UserResponseDto' },
      },
    },
  })
  async getProfile(@CurrentUser() user: UserDocument) {
    const userResponse = this.authService.transformUserToResponse(user);
    return { user: userResponse };
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update first name, middle name, last name, and contact of the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile updated' },
        user: { $ref: '#/components/schemas/UserResponseDto' },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = (user._id as unknown as Types.ObjectId).toString();
    const updated = await this.authService.updateUserProfile(userId, updateProfileDto);
    return { message: 'Profile updated', user: updated };
  }

  @Patch('password')
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change password for the current user after verifying current password',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = (user._id as unknown as Types.ObjectId).toString();
    await this.authService.changeUserPassword(userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset verification code to user email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset code sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If an account with that email exists, a password reset code has been sent.' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email format',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({
    summary: 'Reset password with verification code',
    description: 'Reset user password using verification code sent to email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully. You can now log in with your new password.' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification code or password format',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}