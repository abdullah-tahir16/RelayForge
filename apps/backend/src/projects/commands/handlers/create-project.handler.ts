import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProjectCommand } from '../impl/create-project.command';
import { ProjectEntity } from '../../entities/project.entity';
import { ProjectSlugService } from '../../services/project-slug.service';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler
  implements ICommandHandler<CreateProjectCommand, ProjectEntity>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectSlugService: ProjectSlugService,
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectEntity> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      command.userId,
    );
    const key = await this.projectSlugService.generateUniqueKey(
      workspaceId,
      command.name,
    );

    return this.repository.save(
      this.repository.create({
        workspaceId,
        name: command.name,
        key,
        description: command.description ?? null,
      }),
    );
  }
}
