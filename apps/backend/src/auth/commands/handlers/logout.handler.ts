import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LogoutCommand } from '../impl/logout.command';
import { RefreshTokensRepository } from '../../repositories/refresh-tokens.repository';
import { TokenService } from '../../services/token.service';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const presentedHash = this.tokenService.hashRefreshToken(
      command.refreshToken,
    );
    const existing =
      await this.refreshTokensRepository.findByTokenHash(presentedHash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokensRepository.revokeFamily(existing.familyId);
  }
}
