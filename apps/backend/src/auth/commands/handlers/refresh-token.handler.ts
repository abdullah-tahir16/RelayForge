import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RefreshTokenCommand } from '../impl/refresh-token.command';
import { RefreshTokenEntity } from '../../entities/refresh-token.entity';
import { RefreshTokensRepository } from '../../repositories/refresh-tokens.repository';
import { TokenService } from '../../services/token.service';
import { AuthTokensResponse } from '../../dto/auth-tokens-response.dto';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand, AuthTokensResponse>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthTokensResponse> {
    const presentedHash = this.tokenService.hashRefreshToken(
      command.refreshToken,
    );
    const existing =
      await this.refreshTokensRepository.findByTokenHash(presentedHash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (existing.rotatedAt) {
      // Reuse of an already-exchanged token: treat as theft and burn the family.
      await this.refreshTokensRepository.revokeFamily(existing.familyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected; session revoked',
      );
    }

    if (this.tokenService.isRefreshTokenExpired(existing.createdAt)) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const newRefreshToken = this.tokenService.generateRefreshToken();
    const accessToken = this.tokenService.signAccessToken(existing.userId);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        RefreshTokenEntity,
        { id: existing.id },
        { rotatedAt: new Date() },
      );
      await manager.save(
        manager.create(RefreshTokenEntity, {
          userId: existing.userId,
          tokenHash: newRefreshToken.hash,
          familyId: existing.familyId,
          rotatedAt: null,
          revokedAt: null,
        }),
      );
    });

    return { accessToken, refreshToken: newRefreshToken.raw };
  }
}
