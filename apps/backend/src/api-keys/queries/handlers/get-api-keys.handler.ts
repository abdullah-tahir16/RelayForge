import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetApiKeysQuery } from '../impl/get-api-keys.query';
import { ApiKeysRepository } from '../../repositories/api-keys.repository';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { ApiKeyResponse, toApiKeyResponse } from '../../dto/api-key-response.dto';

@QueryHandler(GetApiKeysQuery)
export class GetApiKeysHandler
  implements IQueryHandler<GetApiKeysQuery, ApiKeyResponse[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly apiKeysRepository: ApiKeysRepository,
  ) {}

  async execute(query: GetApiKeysQuery): Promise<ApiKeyResponse[]> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      query.projectId,
      workspaceId,
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const keys = await this.apiKeysRepository.findAllByProjectId(project.id);
    return keys.map(toApiKeyResponse);
  }
}
