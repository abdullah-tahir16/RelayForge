import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { LoginCommand } from '../impl/login.command';
import { RefreshTokenEntity } from '../../entities/refresh-token.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { PasswordService } from '../../services/password.service';
import { TokenService } from '../../services/token.service';
import { AuthTokensResponse } from '../../dto/auth-tokens-response.dto';

@CommandHandler(LoginCommand)
export class LoginHandler
  implements ICommandHandler<LoginCommand, AuthTokensResponse>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
  ) {}

  async execute(command: LoginCommand): Promise<AuthTokensResponse> {
    const { email, password } = command;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.verify(
      user.passwordHash,
      password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.tokenService.signAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: refreshToken.hash,
        familyId: randomUUID(),
        rotatedAt: null,
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken: refreshToken.raw };
  }
}
