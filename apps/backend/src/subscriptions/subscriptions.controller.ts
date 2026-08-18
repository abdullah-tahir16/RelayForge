import {
  Body,
  Controller,
  Delete,
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
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscribeEndpointCommand } from './commands/impl/subscribe-endpoint.command';
import { UnsubscribeCommand } from './commands/impl/unsubscribe.command';
import { GetSubscriptionsQuery } from './queries/impl/get-subscriptions.query';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('api/v1/endpoints/:id/subscriptions')
  subscribe(
    @CurrentUser() user: UserEntity,
    @Param('id') endpointId: string,
    @Body() dto: SubscribeDto,
  ): Promise<SubscriptionEntity> {
    return this.commandBus.execute(
      new SubscribeEndpointCommand(user.id, endpointId, dto.eventPattern),
    );
  }

  @Get('api/v1/endpoints/:id/subscriptions')
  findAll(
    @CurrentUser() user: UserEntity,
    @Param('id') endpointId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<SubscriptionEntity>> {
    return this.queryBus.execute(
      new GetSubscriptionsQuery(
        user.id,
        endpointId,
        pagination.page,
        pagination.pageSize,
      ),
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('api/v1/subscriptions/:id')
  unsubscribe(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new UnsubscribeCommand(user.id, id));
  }
}
