import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserDocument } from '../schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', // Use email instead of username
      passwordField: 'password',
    });
  }

  /**
   * Validate user credentials
   * @param email User email
   * @param password User password
   * @returns User document if valid
   */
  async validate(email: string, password: string): Promise<UserDocument> {
    try {
      // First check if user exists and get their verification status
      const existingUser = await this.authService.findUserByEmail(email);
      
      if (!existingUser) {
        throw new UnauthorizedException('Invalid email or password');
      }
      
      if (!existingUser.isEmailVerified) {
        throw new UnauthorizedException('EMAIL_NOT_VERIFIED: Please verify your email address before logging in');
      }
      
      // Now validate credentials for verified user
      const user = await this.authService.validateUser(email, password);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
      
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid email or password');
    }
  }
}