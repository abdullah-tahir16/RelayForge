import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteProjectCommand } from '../impl/delete-project.command';
import { ProjectEntity } from '../../entities/project.entity';
import { ProjectsRepository } from '../../repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@CommandHandler(DeleteProjectCommand)
export class DeleteProjectHandler
  implements ICommandHandler<DeleteProjectCommand, void>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async execute(command: DeleteProjectCommand): Promise<void> {
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

    await this.repository.delete(project.id);
  }
}
