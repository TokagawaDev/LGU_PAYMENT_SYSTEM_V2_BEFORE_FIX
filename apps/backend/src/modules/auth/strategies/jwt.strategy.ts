import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../services/jwt.service';
import { UserDocument } from '../schemas/user.schema';
import { environmentConfig } from '../../../config/environment';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract strictly from HTTP-only cookies
        (request: Request) => {
          return request?.cookies?.['access-token'] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: environmentConfig.jwtAccessSecret,
      passReqToCallback: true,
    });
  }

  /**
   * Validate JWT payload and return user
   * @param request Express request object
   * @param payload JWT payload
   * @returns User document
   */
  async validate(request: Request, payload: JwtPayload): Promise<UserDocument> {
    const user = await this.authService.findUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Attach token info to user for potential logout/revocation
    Object.assign(user, {
      currentToken: {
        jti: payload.iat,
        iat: payload.iat,
        exp: payload.exp,
      },
    });

    return user;
  }
}