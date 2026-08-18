import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetEventsQuery } from '../impl/get-events.query';
import { EventEntity } from '../../entities/event.entity';
import { DeliveryEntity } from '../../../deliveries/entities/delivery.entity';
import { EventListItem } from '../../dto/event-list-item.dto';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { paginateQueryBuilder } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';

@QueryHandler(GetEventsQuery)
export class GetEventsHandler
  implements IQueryHandler<GetEventsQuery, PaginatedResponse<EventListItem>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveriesRepository: Repository<DeliveryEntity>,
  ) {}

  async execute(
    query: GetEventsQuery,
  ): Promise<PaginatedResponse<EventListItem>> {
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

    const qb = this.eventsRepository
      .createQueryBuilder('event')
      .where('event.projectId = :projectId', { projectId: project.id })
      .orderBy('event.createdAt', 'DESC');

    if (query.eventType) {
      qb.andWhere('event.eventType = :eventType', {
        eventType: query.eventType,
      });
    }
    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }
    if (query.createdFrom) {
      qb.andWhere('event.createdAt >= :createdFrom', {
        createdFrom: query.createdFrom,
      });
    }
    if (query.createdTo) {
      qb.andWhere('event.createdAt <= :createdTo', {
        createdTo: query.createdTo,
      });
    }
    if (query.endpointId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM deliveries d WHERE d.event_id = event.id AND d.endpoint_id = :endpointId)`,
        { endpointId: query.endpointId },
      );
    }

    const page = await paginateQueryBuilder(qb, query.page, query.pageSize);
    const items = await this.withDeliveryCounts(page.items);

    return { ...page, items };
  }

  private async withDeliveryCounts(
    events: EventEntity[],
  ): Promise<EventListItem[]> {
    if (events.length === 0) {
      return [];
    }

    const counts = await this.deliveriesRepository
      .createQueryBuilder('delivery')
      .select('delivery.eventId', 'eventId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE delivery.status = 'SUCCEEDED')`,
        'succeeded',
      )
      .where('delivery.eventId IN (:...eventIds)', {
        eventIds: events.map((event) => event.id),
      })
      .groupBy('delivery.eventId')
      .getRawMany<{ eventId: string; total: string; succeeded: string }>();

    const countsByEventId = new Map(
      counts.map((row) => [
        row.eventId,
        { total: Number(row.total), succeeded: Number(row.succeeded) },
      ]),
    );

    return events.map((event) => ({
      id: event.id,
      event: event.eventType,
      status: event.status,
      createdAt: event.createdAt,
      deliveryTotal: countsByEventId.get(event.id)?.total ?? 0,
      deliverySucceeded: countsByEventId.get(event.id)?.succeeded ?? 0,
    }));
  }
}
