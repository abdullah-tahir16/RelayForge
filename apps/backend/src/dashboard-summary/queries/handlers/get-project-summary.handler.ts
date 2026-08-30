import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { EventEntity, EventStatus } from '../../../events/entities/event.entity';
import { EndpointEntity } from '../../../endpoints/entities/endpoint.entity';
import {
  DeliveryEntity,
  DeliveryStatus,
} from '../../../deliveries/entities/delivery.entity';
import {
  ProjectSummaryResponseDto,
  RecentActivityItemDto,
} from '../../dto/project-summary-response.dto';
import { GetProjectSummaryQuery } from '../impl/get-project-summary.query';

const RECENT_ACTIVITY_LIMIT = 10;

const IN_FLIGHT_STATUSES = [
  EventStatus.ACCEPTED,
  EventStatus.PUBLISHED,
  EventStatus.PROCESSING,
];

const NEEDS_ATTENTION_STATUSES = [EventStatus.PARTIALLY_FAILED, EventStatus.FAILED];

@QueryHandler(GetProjectSummaryQuery)
export class GetProjectSummaryHandler
  implements IQueryHandler<GetProjectSummaryQuery, ProjectSummaryResponseDto>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(EndpointEntity)
    private readonly endpoints: Repository<EndpointEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveries: Repository<DeliveryEntity>,
  ) {}

  async execute(
    query: GetProjectSummaryQuery,
  ): Promise<ProjectSummaryResponseDto> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      query.projectId,
      workspaceId,
    );
    if (!project) throw new NotFoundException('Project not found');

    const [
      inFlightCount,
      needsAttentionCount,
      dlqBacklogCount,
      enabledCount,
      disabledCount,
      recentActivity,
    ] = await Promise.all([
      this.events.count({
        where: { projectId: project.id, status: In(IN_FLIGHT_STATUSES) },
      }),
      this.events.count({
        where: { projectId: project.id, status: In(NEEDS_ATTENTION_STATUSES) },
      }),
      this.countDlqBacklog(project.id),
      this.endpoints.count({
        where: { projectId: project.id, enabled: true },
      }),
      this.endpoints.count({
        where: { projectId: project.id, enabled: false },
      }),
      this.getRecentActivity(project.id),
    ]);

    return {
      inFlightCount,
      needsAttentionCount,
      dlqBacklogCount,
      endpoints: { enabled: enabledCount, disabled: disabledCount },
      recentActivity,
    };
  }

  private countDlqBacklog(projectId: string): Promise<number> {
    return this.deliveries
      .createQueryBuilder('delivery')
      .innerJoin('events', 'event', 'event.id = delivery.event_id')
      .where('event.project_id = :projectId', { projectId })
      .andWhere('delivery.status = :status', {
        status: DeliveryStatus.DEAD_LETTERED,
      })
      .getCount();
  }

  private async getRecentActivity(
    projectId: string,
  ): Promise<RecentActivityItemDto[]> {
    const rows = await this.events
      .createQueryBuilder('event')
      .select('event.id', 'eventId')
      .addSelect('event.eventType', 'eventType')
      .addSelect('event.status', 'status')
      .addSelect(`event.source = 'ENDPOINT_TEST'`, 'isTest')
      .addSelect('event.createdAt', 'createdAt')
      .where('event.projectId = :projectId', { projectId })
      .orderBy('event.createdAt', 'DESC')
      .addOrderBy('event.id', 'DESC')
      .limit(RECENT_ACTIVITY_LIMIT)
      .getRawMany();

    return rows.map((row) => ({
      eventId: row.eventId,
      eventType: row.eventType,
      status: row.status,
      isTest: row.isTest === true || row.isTest === 'true',
      createdAt: row.createdAt,
    }));
  }
}
