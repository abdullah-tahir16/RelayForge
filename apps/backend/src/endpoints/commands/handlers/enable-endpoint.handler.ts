import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnableEndpointCommand } from '../impl/enable-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import {
  EndpointResponseDto,
  toEndpointResponse,
} from '../../dto/endpoint-response.dto';

@CommandHandler(EnableEndpointCommand)
export class EnableEndpointHandler
  implements ICommandHandler<EnableEndpointCommand, EndpointResponseDto>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: EnableEndpointCommand): Promise<EndpointResponseDto> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    endpoint.enabled = true;
    endpoint.disabledAt = null;

    return toEndpointResponse(await this.repository.save(endpoint));
  }
}
