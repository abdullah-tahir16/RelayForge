import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokeApiKeyCommand } from '../impl/revoke-api-key.command';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import { ApiKeysRepository } from '../../repositories/api-keys.repository';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { ApiKeyResponse, toApiKeyResponse } from '../../dto/api-key-response.dto';

@CommandHandler(RevokeApiKeyCommand)
export class RevokeApiKeyHandler
  implements ICommandHandler<RevokeApiKeyCommand, ApiKeyResponse>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly apiKeysRepository: ApiKeysRepository,
    @InjectRepository(ApiKeyEntity)
    private readonly repository: Repository<ApiKeyEntity>,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<ApiKeyResponse> {
    const apiKey = await this.apiKeysRepository.findById(command.apiKeyId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      command.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      apiKey.projectId,
      workspaceId,
    );
    if (!project) {
      throw new NotFoundException('API key not found');
    }

    apiKey.revokedAt = new Date();
    const saved = await this.repository.save(apiKey);
    return toApiKeyResponse(saved);
  }
}
