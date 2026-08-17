import { Injectable, NotFoundException } from '@nestjs/common';
import { EndpointEntity } from '../entities/endpoint.entity';
import { EndpointsRepository } from '../repositories/endpoints.repository';
import { ProjectsRepository } from '../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../workspaces/services/workspaces.service';

@Injectable()
export class EndpointAuthorizationService {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly endpointsRepository: EndpointsRepository,
  ) {}

  /** Returns the endpoint only if it belongs to a project the given user's workspace owns; otherwise 404. */
  async getOwnedEndpoint(
    userId: string,
    endpointId: string,
  ): Promise<EndpointEntity> {
    const endpoint = await this.endpointsRepository.findById(endpointId);
    if (!endpoint) {
      throw new NotFoundException('Endpoint not found');
    }

    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      endpoint.projectId,
      workspaceId,
    );
    if (!project) {
      throw new NotFoundException('Endpoint not found');
    }

    return endpoint;
  }
}
