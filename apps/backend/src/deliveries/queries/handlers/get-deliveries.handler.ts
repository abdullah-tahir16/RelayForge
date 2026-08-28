import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDeliveriesQuery } from '../impl/get-deliveries.query';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { EndpointEntity } from '../../../endpoints/entities/endpoint.entity';
import { EventEntity } from '../../../events/entities/event.entity';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { paginateQueryBuilder } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';
import { DeliveryListItem } from '../../dto/delivery-list-item.dto';
import { endpointTestTargetId } from '../../../events/services/event-source';

@QueryHandler(GetDeliveriesQuery)
export class GetDeliveriesHandler
  implements
    IQueryHandler<GetDeliveriesQuery, PaginatedResponse<DeliveryListItem>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(DeliveryEntity)
    private readonly repository: Repository<DeliveryEntity>,
  ) {}

  async execute(
    query: GetDeliveriesQuery,
  ): Promise<PaginatedResponse<DeliveryListItem>> {
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

    const qb = this.repository
      .createQueryBuilder('delivery')
      .innerJoin(EndpointEntity, 'endpoint', 'endpoint.id = delivery.endpointId')
      .where('endpoint.projectId = :projectId', { projectId: project.id })
      .orderBy('delivery.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('delivery.status = :status', { status: query.status });
    }
    if (query.endpointId) {
      qb.andWhere('delivery.endpointId = :endpointId', {
        endpointId: query.endpointId,
      });
    }
    if (query.eventId) {
      qb.andWhere('delivery.eventId = :eventId', { eventId: query.eventId });
    }
    if (query.httpStatusCode !== undefined) {
      qb.andWhere('delivery.httpStatusCode = :httpStatusCode', {
        httpStatusCode: query.httpStatusCode,
      });
    }
    if (query.createdFrom) {
      qb.andWhere('delivery.createdAt >= :createdFrom', {
        createdFrom: query.createdFrom,
      });
    }
    if (query.createdTo) {
      qb.andWhere('delivery.createdAt <= :createdTo', {
        createdTo: query.createdTo,
      });
    }

    const page = await paginateQueryBuilder(qb, query.page, query.pageSize);
    if (page.items.length === 0) {
      return { ...page, items: [] };
    }

    const events = await this.repository.manager.find(EventEntity, {
      where: page.items.map((delivery) => ({ id: delivery.eventId })),
    });
    const eventById = new Map(events.map((event) => [event.id, event]));

    return {
      ...page,
      items: page.items.map((delivery) => {
        const event = eventById.get(delivery.eventId);
        const testTargetEndpointId = event
          ? endpointTestTargetId(event)
          : null;
        return {
          ...delivery,
          isTest: testTargetEndpointId !== null,
          testTargetEndpointId,
        };
      }),
    };
  }
}
