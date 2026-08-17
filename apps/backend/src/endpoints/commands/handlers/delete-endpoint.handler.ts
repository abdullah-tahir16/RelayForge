import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteEndpointCommand } from '../impl/delete-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';

@CommandHandler(DeleteEndpointCommand)
export class DeleteEndpointHandler
  implements ICommandHandler<DeleteEndpointCommand, void>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: DeleteEndpointCommand): Promise<void> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    await this.repository.delete(endpoint.id);
  }
}
