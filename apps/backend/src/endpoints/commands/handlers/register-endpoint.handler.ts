import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterEndpointCommand } from '../impl/register-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointUrlValidatorService } from '../../services/endpoint-url-validator.service';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

const DEFAULT_TIMEOUT_MS = 10000;

@CommandHandler(RegisterEndpointCommand)
export class RegisterEndpointHandler
  implements ICommandHandler<RegisterEndpointCommand, EndpointEntity>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly urlValidator: EndpointUrlValidatorService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: RegisterEndpointCommand): Promise<EndpointEntity> {
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

    const validation = this.urlValidator.validate(command.url);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid endpoint URL: ${validation.reason}`);
    }

    return this.repository.save(
      this.repository.create({
        projectId: project.id,
        name: command.name,
        url: command.url,
        description: command.description ?? null,
        enabled: true,
        timeoutMs: command.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        disabledAt: null,
      }),
    );
  }
}
