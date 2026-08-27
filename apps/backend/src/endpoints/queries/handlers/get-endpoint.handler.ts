import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetEndpointQuery } from '../impl/get-endpoint.query';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import {
  EndpointResponseDto,
  toEndpointResponse,
} from '../../dto/endpoint-response.dto';

@QueryHandler(GetEndpointQuery)
export class GetEndpointHandler
  implements IQueryHandler<GetEndpointQuery, EndpointResponseDto>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
  ) {}

  async execute(query: GetEndpointQuery): Promise<EndpointResponseDto> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      query.userId,
      query.endpointId,
    );
    return toEndpointResponse(endpoint);
  }
}
