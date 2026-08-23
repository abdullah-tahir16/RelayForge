import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetDeliveryAttemptsQuery } from '../impl/get-delivery-attempts.query';
import { DeliveryAttemptEntity } from '../../entities/delivery-attempt.entity';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { EventEntity } from '../../../events/entities/event.entity';
import { ProjectEntity } from '../../../projects/entities/project.entity';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { DeliveryAttemptResponseDto } from '../../dto/delivery-attempt-response.dto';
import { DeliveryRunEntity } from '../../entities/delivery-run.entity';

@QueryHandler(GetDeliveryAttemptsQuery)
export class GetDeliveryAttemptsHandler
  implements IQueryHandler<GetDeliveryAttemptsQuery, DeliveryAttemptResponseDto[]>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    @InjectRepository(DeliveryEntity)
    private readonly deliveriesRepository: Repository<DeliveryEntity>,
    @InjectRepository(DeliveryAttemptEntity)
    private readonly attemptsRepository: Repository<DeliveryAttemptEntity>,
    @InjectRepository(DeliveryRunEntity)
    private readonly runsRepository: Repository<DeliveryRunEntity>,
  ) {}

  async execute(query: GetDeliveryAttemptsQuery): Promise<DeliveryAttemptResponseDto[]> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(query.userId);
    const delivery = await this.deliveriesRepository
      .createQueryBuilder('delivery')
      .innerJoin(EventEntity, 'event', 'event.id = delivery.eventId')
      .innerJoin(ProjectEntity, 'project', 'project.id = event.projectId')
      .where('delivery.id = :deliveryId', { deliveryId: query.deliveryId })
      .andWhere('project.workspaceId = :workspaceId', { workspaceId })
      .getOne();
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    const attempts = await this.attemptsRepository.find({
      where: { deliveryId: query.deliveryId },
      order: { attemptNumber: 'ASC' },
    });
    const runs = await this.runsRepository.find({
      where: { deliveryId: query.deliveryId },
    });
    const runById = new Map(runs.map((run) => [run.id, run]));
    return attempts.map((attempt) => {
      const run = runById.get(attempt.runId);
      return DeliveryAttemptResponseDto.fromEntity(
        attempt,
        run ? { runNumber: run.runNumber, trigger: run.trigger } : undefined,
      );
    });
  }
}
