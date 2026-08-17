import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectsQuery } from '../impl/get-projects.query';
import { ProjectEntity } from '../../entities/project.entity';
import { ProjectsRepository } from '../../repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@QueryHandler(GetProjectsQuery)
export class GetProjectsHandler
  implements IQueryHandler<GetProjectsQuery, ProjectEntity[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async execute(query: GetProjectsQuery): Promise<ProjectEntity[]> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    return this.projectsRepository.findAllByWorkspaceId(workspaceId);
  }
}
