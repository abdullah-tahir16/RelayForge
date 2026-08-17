import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserCommand } from './commands/impl/register-user.command';
import { LoginCommand } from './commands/impl/login.command';
import { RefreshTokenCommand } from './commands/impl/refresh-token.command';
import { LogoutCommand } from './commands/impl/logout.command';
import { GetCurrentUserQuery } from './queries/impl/get-current-user.query';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { UserResponse } from './dto/user-response.dto';
import { AuthTokensResponse } from './dto/auth-tokens-response.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<UserResponse> {
    return this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.password),
    );
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthTokensResponse> {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    return this.commandBus.execute(new RefreshTokenCommand(dto.refreshToken));
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.commandBus.execute(new LogoutCommand(dto.refreshToken));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: UserEntity): Promise<UserResponse> {
    return this.queryBus.execute(new GetCurrentUserQuery(user.id));
  }
}
