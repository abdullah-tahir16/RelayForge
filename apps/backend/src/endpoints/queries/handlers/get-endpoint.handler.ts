import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEndpointQuery } from '../impl/get-endpoint.query';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';

@QueryHandler(GetEndpointQuery)
export class GetEndpointHandler
  implements IQueryHandler<GetEndpointQuery, EndpointEntity>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
  ) {}

  execute(query: GetEndpointQuery): Promise<EndpointEntity> {
    return this.endpointAuthorizationService.getOwnedEndpoint(
      query.userId,
      query.endpointId,
    );
  }
}
