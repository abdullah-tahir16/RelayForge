import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubscriptionsQuery } from '../impl/get-subscriptions.query';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import { EndpointAuthorizationService } from '../../../endpoints/services/endpoint-authorization.service';

@QueryHandler(GetSubscriptionsQuery)
export class GetSubscriptionsHandler
  implements IQueryHandler<GetSubscriptionsQuery, SubscriptionEntity[]>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute(
    query: GetSubscriptionsQuery,
  ): Promise<SubscriptionEntity[]> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      query.userId,
      query.endpointId,
    );

    return this.subscriptionsRepository.findAllByEndpointId(endpoint.id);
  }
}
