import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RegisterUserCommand } from '../impl/register-user.command';
import { UserEntity } from '../../entities/user.entity';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { PasswordService } from '../../services/password.service';
import { toUserResponse, UserResponse } from '../../dto/user-response.dto';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler
  implements ICommandHandler<RegisterUserCommand, UserResponse>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<UserResponse> {
    const { email, password } = command;

    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordService.hash(password);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        manager.create(UserEntity, { email, passwordHash }),
      );
      const workspace = await manager.save(
        manager.create(WorkspaceEntity, {
          ownerUserId: user.id,
          name: `${email}'s workspace`,
        }),
      );
      return toUserResponse(user, workspace);
    });
  }
}
