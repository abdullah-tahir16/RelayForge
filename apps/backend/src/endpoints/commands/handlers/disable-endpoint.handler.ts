import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisableEndpointCommand } from '../impl/disable-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import {
  EndpointResponseDto,
  toEndpointResponse,
} from '../../dto/endpoint-response.dto';

@CommandHandler(DisableEndpointCommand)
export class DisableEndpointHandler
  implements ICommandHandler<DisableEndpointCommand, EndpointResponseDto>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: DisableEndpointCommand): Promise<EndpointResponseDto> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    endpoint.enabled = false;
    endpoint.disabledAt = new Date();

    return toEndpointResponse(await this.repository.save(endpoint));
  }
}
