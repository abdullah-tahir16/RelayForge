import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../../common/pagination/pagination-query.dto';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';
import { ProjectsRepository } from '../../../projects/repositories/projects.repository';
import { WorkspacesService } from '../../../workspaces/services/workspaces.service';
import { DlqItemResponseDto } from '../../dto/dlq-item-response.dto';
import { DeliveryEntity } from '../../entities/delivery.entity';
import { GetDlqQuery } from '../impl/get-dlq.query';

@QueryHandler(GetDlqQuery)
export class GetDlqHandler
  implements IQueryHandler<GetDlqQuery, PaginatedResponse<DlqItemResponseDto>>
{
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly projectsRepository: ProjectsRepository,
    @InjectRepository(DeliveryEntity)
    private readonly deliveries: Repository<DeliveryEntity>,
  ) {}

  async execute(
    query: GetDlqQuery,
  ): Promise<PaginatedResponse<DlqItemResponseDto>> {
    const workspaceId = await this.workspacesService.getWorkspaceIdForUser(
      query.userId,
    );
    const project = await this.projectsRepository.findByIdInWorkspace(
      query.projectId,
      workspaceId,
    );
    if (!project) throw new NotFoundException('Project not found');

    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const base = this.deliveries
      .createQueryBuilder('delivery')
      .innerJoin('events', 'event', 'event.id = delivery.event_id')
      .innerJoin('endpoints', 'endpoint', 'endpoint.id = delivery.endpoint_id')
      .innerJoin('delivery_runs', 'run', 'run.id = delivery.current_run_id')
      .leftJoin(
        'delivery_attempts',
        'attempt',
        'attempt.run_id = run.id AND attempt.run_attempt_number = run.attempt_count',
      )
      .where('event.project_id = :projectId', { projectId: project.id })
      .andWhere(`delivery.status = 'DEAD_LETTERED'`);

    const total = await base.clone().getCount();
    const rows = await base
      .select('delivery.id', 'deliveryId')
      .addSelect('event.id', 'eventId')
      .addSelect('event.event_type', 'eventType')
      .addSelect(`event.source = 'ENDPOINT_TEST'`, 'isTest')
      .addSelect('event.test_target_endpoint_id', 'testTargetEndpointId')
      .addSelect('endpoint.id', 'endpointId')
      .addSelect('endpoint.name', 'endpointName')
      .addSelect('endpoint.enabled', 'endpointEnabled')
      .addSelect('run.id', 'runId')
      .addSelect('run.run_number', 'runNumber')
      .addSelect(
        `CASE
          WHEN attempt.response_status IS NOT NULL THEN 'HTTP_' || attempt.response_status::text
          WHEN attempt.error_code ~ '^[A-Za-z0-9_-]{1,64}$' THEN upper(attempt.error_code)
          ELSE 'DELIVERY_FAILED'
        END`,
        'failureReason',
      )
      .addSelect('attempt.response_status', 'httpStatusCode')
      .addSelect('run.attempt_count', 'attemptCount')
      .addSelect('attempt.completed_at', 'lastAttemptAt')
      .addSelect('delivery.created_at', 'createdAt')
      .addSelect('delivery.dead_lettered_at', 'deadLetteredAt')
      .orderBy('delivery.dead_lettered_at', 'DESC')
      .addOrderBy('delivery.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return {
      items: rows.map((row) => ({
        ...row,
        isTest: row.isTest === true || row.isTest === 'true',
        testTargetEndpointId: row.testTargetEndpointId ?? null,
        endpointEnabled: Boolean(row.endpointEnabled),
        runNumber: Number(row.runNumber),
        httpStatusCode:
          row.httpStatusCode === null ? null : Number(row.httpStatusCode),
        attemptCount: Number(row.attemptCount),
      })),
      total,
      page,
      pageSize,
    };
  }
}
