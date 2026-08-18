import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEndpointsLookupQuery } from '../impl/get-endpoints-lookup.query';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointLookupItem } from '../../dto/endpoint-lookup-item.dto';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@QueryHandler(GetEndpointsLookupQuery)
export class GetEndpointsLookupHandler
  implements IQueryHandler<GetEndpointsLookupQuery, EndpointLookupItem[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(
    query: GetEndpointsLookupQuery,
  ): Promise<EndpointLookupItem[]> {
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

    return this.repository.find({
      where: { projectId: project.id },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
  }
}
