import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { UserEntity } from './entities/user.entity';
import { WorkspaceEntity } from './entities/workspace.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UsersRepository } from './repositories/users.repository';
import { WorkspacesRepository } from './repositories/workspaces.repository';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { LoginHandler } from './commands/handlers/login.handler';
import { RefreshTokenHandler } from './commands/handlers/refresh-token.handler';
import { LogoutHandler } from './commands/handlers/logout.handler';
import { GetCurrentUserHandler } from './queries/handlers/get-current-user.handler';

const commandHandlers = [
  RegisterUserHandler,
  LoginHandler,
  RefreshTokenHandler,
  LogoutHandler,
];
const queryHandlers = [GetCurrentUserHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, WorkspaceEntity, RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    UsersRepository,
    WorkspacesRepository,
    RefreshTokensRepository,
    PasswordService,
    TokenService,
    JwtStrategy,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class AuthModule {}
