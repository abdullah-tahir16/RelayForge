import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEndpointsQuery } from '../impl/get-endpoints.query';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointsRepository } from '../../repositories/endpoints.repository';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@QueryHandler(GetEndpointsQuery)
export class GetEndpointsHandler
  implements IQueryHandler<GetEndpointsQuery, EndpointEntity[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly endpointsRepository: EndpointsRepository,
  ) {}

  async execute(query: GetEndpointsQuery): Promise<EndpointEntity[]> {
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

    return this.endpointsRepository.findAllByProjectId(project.id);
  }
}
