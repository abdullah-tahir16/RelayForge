import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerateApiKeyCommand } from '../impl/generate-api-key.command';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import { ApiKeyGeneratorService } from '../../services/api-key-generator.service';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import {
  ApiKeyCreatedResponse,
  toApiKeyResponse,
} from '../../dto/api-key-response.dto';

@CommandHandler(GenerateApiKeyCommand)
export class GenerateApiKeyHandler
  implements ICommandHandler<GenerateApiKeyCommand, ApiKeyCreatedResponse>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly apiKeyGeneratorService: ApiKeyGeneratorService,
    @InjectRepository(ApiKeyEntity)
    private readonly repository: Repository<ApiKeyEntity>,
  ) {}

  async execute(
    command: GenerateApiKeyCommand,
  ): Promise<ApiKeyCreatedResponse> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      command.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      command.projectId,
      workspaceId,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const generated = this.apiKeyGeneratorService.generate();

    const entity = await this.repository.save(
      this.repository.create({
        projectId: project.id,
        name: command.name,
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        lastUsedAt: null,
        revokedAt: null,
      }),
    );

    return { ...toApiKeyResponse(entity), key: generated.key };
  }
}
