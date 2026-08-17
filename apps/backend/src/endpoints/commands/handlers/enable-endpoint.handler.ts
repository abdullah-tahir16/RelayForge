import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnableEndpointCommand } from '../impl/enable-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';

@CommandHandler(EnableEndpointCommand)
export class EnableEndpointHandler
  implements ICommandHandler<EnableEndpointCommand, EndpointEntity>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: EnableEndpointCommand): Promise<EndpointEntity> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    endpoint.enabled = true;
    endpoint.disabledAt = null;

    return this.repository.save(endpoint);
  }
}
