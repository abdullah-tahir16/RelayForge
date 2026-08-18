import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetProjectsQuery } from '../impl/get-projects.query';
import { ProjectEntity } from '../../entities/project.entity';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { paginate } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';

@QueryHandler(GetProjectsQuery)
export class GetProjectsHandler
  implements IQueryHandler<GetProjectsQuery, PaginatedResponse<ProjectEntity>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async execute(
    query: GetProjectsQuery,
  ): Promise<PaginatedResponse<ProjectEntity>> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    return paginate(
      this.repository,
      { where: { workspaceId }, order: { createdAt: 'DESC' } },
      query.page,
      query.pageSize,
    );
  }
}
