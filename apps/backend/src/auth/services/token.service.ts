import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  OpaqueToken,
} from '../../common/crypto/opaque-token.util';

export type RawRefreshToken = OpaqueToken;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      },
    );
  }

  generateRefreshToken(): RawRefreshToken {
    return generateOpaqueToken(32);
  }

  hashRefreshToken(raw: string): string {
    return hashOpaqueToken(raw);
  }

  isRefreshTokenExpired(createdAt: Date): boolean {
    const refreshExpiresDays = this.configService.get<number>(
      'jwt.refreshExpiresDays',
      30,
    );
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresDays);
    return expiresAt.getTime() < Date.now();
  }
}
