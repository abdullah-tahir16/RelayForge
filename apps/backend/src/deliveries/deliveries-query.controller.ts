import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { DeliveryEntity } from './entities/delivery.entity';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';
import { GetDeliveriesQuery } from './queries/impl/get-deliveries.query';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';
import { GetDeliveryAttemptsQuery } from './queries/impl/get-delivery-attempts.query';
import { DeliveryAttemptResponseDto } from './dto/delivery-attempt-response.dto';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { DlqItemResponseDto } from './dto/dlq-item-response.dto';
import { GetDlqQuery } from './queries/impl/get-dlq.query';
import { DeliveryRunResponseDto } from './dto/delivery-run-response.dto';
import { GetDeliveryRunsQuery } from './queries/impl/get-delivery-runs.query';
import { ReplayDeliveryCommand } from './commands/impl/replay-delivery.command';
import { ReplayEventCommand } from './commands/impl/replay-event.command';
import {
  ReplayDeliveryResponseDto,
  ReplayEventResponseDto,
} from './dto/replay-response.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveriesQueryController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('api/v1/projects/:projectId/dlq')
  findDlq(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<DlqItemResponseDto>> {
    return this.queryBus.execute(
      new GetDlqQuery(user.id, projectId, pagination.page, pagination.pageSize),
    );
  }

  @Get('api/v1/projects/:projectId/deliveries')
  findAll(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Query() filters: ListDeliveriesQueryDto,
  ): Promise<PaginatedResponse<DeliveryEntity>> {
    return this.queryBus.execute(
      new GetDeliveriesQuery(
        user.id,
        projectId,
        filters.page,
        filters.pageSize,
        filters.status,
        filters.endpointId,
        filters.eventId,
        filters.httpStatusCode,
        filters.createdFrom,
        filters.createdTo,
      ),
    );
  }

  @Get('api/v1/deliveries/:deliveryId/attempts')
  findAttempts(
    @CurrentUser() user: UserEntity,
    @Param('deliveryId') deliveryId: string,
  ): Promise<DeliveryAttemptResponseDto[]> {
    return this.queryBus.execute(new GetDeliveryAttemptsQuery(user.id, deliveryId));
  }

  @Get('api/v1/deliveries/:deliveryId/runs')
  findRuns(
    @CurrentUser() user: UserEntity,
    @Param('deliveryId') deliveryId: string,
  ): Promise<DeliveryRunResponseDto[]> {
    return this.queryBus.execute(new GetDeliveryRunsQuery(user.id, deliveryId));
  }

  @Post('api/v1/deliveries/:deliveryId/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  replayDelivery(
    @CurrentUser() user: UserEntity,
    @Param('deliveryId') deliveryId: string,
  ): Promise<ReplayDeliveryResponseDto> {
    return this.commandBus.execute(
      new ReplayDeliveryCommand(user.id, deliveryId),
    );
  }

  @Post('api/v1/events/:eventId/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  replayEvent(
    @CurrentUser() user: UserEntity,
    @Param('eventId') eventId: string,
  ): Promise<ReplayEventResponseDto> {
    return this.commandBus.execute(new ReplayEventCommand(user.id, eventId));
  }
}
