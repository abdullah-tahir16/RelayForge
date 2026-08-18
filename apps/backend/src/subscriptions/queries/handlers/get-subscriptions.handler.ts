import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSubscriptionsQuery } from '../impl/get-subscriptions.query';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { EndpointAuthorizationService } from '../../../endpoints/services/endpoint-authorization.service';
import { paginate } from '../../../common/pagination/paginate';
import { PaginatedResponse } from '../../../common/pagination/paginated-response.dto';

@QueryHandler(GetSubscriptionsQuery)
export class GetSubscriptionsHandler
  implements
    IQueryHandler<GetSubscriptionsQuery, PaginatedResponse<SubscriptionEntity>>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async execute(
    query: GetSubscriptionsQuery,
  ): Promise<PaginatedResponse<SubscriptionEntity>> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      query.userId,
      query.endpointId,
    );

    return paginate(
      this.repository,
      { where: { endpointId: endpoint.id }, order: { createdAt: 'DESC' } },
      query.page,
      query.pageSize,
    );
  }
}
