import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegisterEndpointCommand } from '../impl/register-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointUrlValidatorService } from '../../services/endpoint-url-validator.service';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { EndpointSigningMaterialService } from '../../services/endpoint-signing-material.service';
import {
  EndpointCreatedResponseDto,
  toEndpointResponse,
} from '../../dto/endpoint-response.dto';

const DEFAULT_TIMEOUT_MS = 10000;

@CommandHandler(RegisterEndpointCommand)
export class RegisterEndpointHandler
  implements ICommandHandler<RegisterEndpointCommand, EndpointCreatedResponseDto>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly urlValidator: EndpointUrlValidatorService,
    private readonly signingMaterial: EndpointSigningMaterialService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(
    command: RegisterEndpointCommand,
  ): Promise<EndpointCreatedResponseDto> {
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

    const issued = this.signingMaterial.issue(1);
    const endpoint = await this.repository.save(
      this.repository.create({
        projectId: project.id,
        name: command.name,
        url: command.url,
        description: command.description ?? null,
        enabled: true,
        timeoutMs: command.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        signingSecretEncrypted: issued.signingSecretEncrypted,
        signingSecretHash: issued.signingSecretHash,
        signingSecretVersion: issued.signingSecretVersion,
        signingSecretRotatedAt: issued.signingSecretRotatedAt,
        disabledAt: null,
      }),
    );
    return { ...toEndpointResponse(endpoint), signingSecret: issued.signingSecret };
  }
}
