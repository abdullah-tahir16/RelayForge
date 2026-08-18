import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetApiKeysQuery } from '../impl/get-api-keys.query';
import { ApiKeyEntity } from '../../entities/api-key.entity';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { ApiKeyResponse, toApiKeyResponse } from '../../dto/api-key-response.dto';
import { paginate } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';

@QueryHandler(GetApiKeysQuery)
export class GetApiKeysHandler
  implements IQueryHandler<GetApiKeysQuery, PaginatedResponse<ApiKeyResponse>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(ApiKeyEntity)
    private readonly repository: Repository<ApiKeyEntity>,
  ) {}

  async execute(
    query: GetApiKeysQuery,
  ): Promise<PaginatedResponse<ApiKeyResponse>> {
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

    const result = await paginate(
      this.repository,
      { where: { projectId: project.id }, order: { createdAt: 'DESC' } },
      query.page,
      query.pageSize,
    );

    return { ...result, items: result.items.map(toApiKeyResponse) };
  }
}
