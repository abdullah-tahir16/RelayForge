import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { EventListItem } from './dto/event-list-item.dto';
import { EventDetailResponse } from './dto/event-detail-response.dto';
import { GetEventsQuery } from './queries/impl/get-events.query';
import { GetEventQuery } from './queries/impl/get-event.query';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class EventsQueryController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('api/v1/projects/:projectId/events')
  findAll(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Query() filters: ListEventsQueryDto,
  ): Promise<PaginatedResponse<EventListItem>> {
    return this.queryBus.execute(
      new GetEventsQuery(
        user.id,
        projectId,
        filters.page,
        filters.pageSize,
        filters.eventType,
        filters.status,
        filters.createdFrom,
        filters.createdTo,
        filters.endpointId,
      ),
    );
  }

  @Get('api/v1/events/:id')
  findOne(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<EventDetailResponse> {
    return this.queryBus.execute(new GetEventQuery(user.id, id));
  }
}
