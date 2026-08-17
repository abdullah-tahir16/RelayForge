import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectQuery } from '../impl/get-project.query';
import { ProjectEntity } from '../../entities/project.entity';
import { ProjectsRepository } from '../../repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler
  implements IQueryHandler<GetProjectQuery, ProjectEntity>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async execute(query: GetProjectQuery): Promise<ProjectEntity> {
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
    return project;
  }
}
