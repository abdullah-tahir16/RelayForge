import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';

export interface RawRefreshToken {
  raw: string;
  hash: string;
}

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
    const raw = randomBytes(32).toString('hex');
    return { raw, hash: this.hashRefreshToken(raw) };
  }

  hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
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
