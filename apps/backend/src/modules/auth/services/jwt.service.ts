import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { environmentConfig } from '../../../config/environment';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthJwtService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generate access and refresh tokens for a user
   * @param user User document
   * @returns Token pair
   */
  generateTokens(user: UserDocument): TokenPair {
    const payload: JwtPayload = {
      sub: (user._id as Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: environmentConfig.jwtAccessSecret,
      expiresIn: environmentConfig.jwtAccessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: environmentConfig.jwtRefreshSecret,
      expiresIn: environmentConfig.jwtRefreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify and decode access token
   * @param token Access token
   * @returns Decoded payload
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token, {
        secret: environmentConfig.jwtAccessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   * @param token Refresh token
   * @returns Decoded payload
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify(token, {
        secret: environmentConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate new access token from refresh token
   * @param refreshToken Refresh token
   * @returns New access token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    
    // Create new payload without iat and exp
    const newPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    return this.jwtService.sign(newPayload, {
      secret: environmentConfig.jwtAccessSecret,
      expiresIn: environmentConfig.jwtAccessExpiresIn,
    });
  }

  /**
   * Decode token without verification (for debugging)
   * @param token JWT token
   * @returns Decoded payload
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}