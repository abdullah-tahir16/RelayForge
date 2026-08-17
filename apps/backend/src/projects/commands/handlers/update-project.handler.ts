import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProjectCommand } from '../impl/update-project.command';
import { ProjectEntity } from '../../entities/project.entity';
import { ProjectsRepository } from '../../repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@CommandHandler(UpdateProjectCommand)
export class UpdateProjectHandler
  implements ICommandHandler<UpdateProjectCommand, ProjectEntity>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectEntity> {
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

    if (command.name !== undefined) {
      project.name = command.name;
    }
    if (command.description !== undefined) {
      project.description = command.description;
    }

    return this.repository.save(project);
  }
}
