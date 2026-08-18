import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEventQuery } from '../impl/get-event.query';
import { EventEntity } from '../../entities/event.entity';
import {
  EventDetailResponse,
  toEventDetailResponse,
} from '../../dto/event-detail-response.dto';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';

@QueryHandler(GetEventQuery)
export class GetEventHandler
  implements IQueryHandler<GetEventQuery, EventDetailResponse>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(EventEntity)
    private readonly repository: Repository<EventEntity>,
  ) {}

  async execute(query: GetEventQuery): Promise<EventDetailResponse> {
    const event = await this.repository.findOne({
      where: { id: query.eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      event.projectId,
      workspaceId,
    );
    if (!project) {
      throw new NotFoundException('Event not found');
    }

    return toEventDetailResponse(event);
  }
}
