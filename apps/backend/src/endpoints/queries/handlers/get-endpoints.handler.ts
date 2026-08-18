import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEndpointsQuery } from '../impl/get-endpoints.query';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { paginate } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';

@QueryHandler(GetEndpointsQuery)
export class GetEndpointsHandler
  implements
    IQueryHandler<GetEndpointsQuery, PaginatedResponse<EndpointEntity>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(
    query: GetEndpointsQuery,
  ): Promise<PaginatedResponse<EndpointEntity>> {
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

    return paginate(
      this.repository,
      { where: { projectId: project.id }, order: { createdAt: 'DESC' } },
      query.page,
      query.pageSize,
    );
  }
}
