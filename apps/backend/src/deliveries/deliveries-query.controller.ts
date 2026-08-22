import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { DeliveryEntity } from './entities/delivery.entity';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';
import { GetDeliveriesQuery } from './queries/impl/get-deliveries.query';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';
import { GetDeliveryAttemptsQuery } from './queries/impl/get-delivery-attempts.query';
import { DeliveryAttemptResponseDto } from './dto/delivery-attempt-response.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveriesQueryController {
  constructor(private readonly queryBus: QueryBus) {}

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
}
