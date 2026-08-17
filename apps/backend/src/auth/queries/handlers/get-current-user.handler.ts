import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCurrentUserQuery } from '../impl/get-current-user.query';
import { UsersRepository } from '../../repositories/users.repository';
import { WorkspacesRepository } from '../../repositories/workspaces.repository';
import { toUserResponse, UserResponse } from '../../dto/user-response.dto';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler
  implements IQueryHandler<GetCurrentUserQuery, UserResponse>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly workspacesRepository: WorkspacesRepository,
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<UserResponse> {
    const user = await this.usersRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const workspace = await this.workspacesRepository.findByOwnerUserId(
      user.id,
    );

    return toUserResponse(user, workspace ?? undefined);
  }
}
