import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../../../events/entities/event.entity';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { DeliveryRunResponseDto } from '../../dto/delivery-run-response.dto';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { DeliveryRunEntity } from '../../entities/delivery-run.entity';
import { GetDeliveryRunsQuery } from '../impl/get-delivery-runs.query';

@QueryHandler(GetDeliveryRunsQuery)
export class GetDeliveryRunsHandler
  implements IQueryHandler<GetDeliveryRunsQuery, DeliveryRunResponseDto[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    @InjectRepository(DeliveryEntity)
    private readonly deliveries: Repository<DeliveryEntity>,
    @InjectRepository(DeliveryRunEntity)
    private readonly runs: Repository<DeliveryRunEntity>,
  ) {}

  async execute(query: GetDeliveryRunsQuery): Promise<DeliveryRunResponseDto[]> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    const delivery = await this.deliveries
      .createQueryBuilder('delivery')
      .innerJoin(EventEntity, 'event', 'event.id = delivery.eventId')
      .innerJoin(ProjectEntity, 'project', 'project.id = event.projectId')
      .where('delivery.id = :deliveryId', { deliveryId: query.deliveryId })
      .andWhere('project.workspaceId = :workspaceId', { workspaceId })
      .getOne();
    if (!delivery) throw new NotFoundException('Delivery not found');

    const rows = await this.runs
      .createQueryBuilder('run')
      .leftJoin('users', 'actor', 'actor.id = run.requested_by_user_id')
      .select('run')
      .addSelect('actor.id', 'actorId')
      .addSelect('actor.email', 'actorEmail')
      .where('run.delivery_id = :deliveryId', { deliveryId: delivery.id })
      .orderBy('run.run_number', 'ASC')
      .getRawAndEntities();

    return rows.entities.map((run, index) => {
      const raw = rows.raw[index];
      return {
        ...run,
        requestedBy: raw.actorId
          ? { id: raw.actorId, email: raw.actorEmail }
          : null,
      };
    });
  }
}
