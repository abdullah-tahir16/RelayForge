import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateEndpointCommand } from '../impl/update-endpoint.command';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import { EndpointUrlValidatorService } from '../../services/endpoint-url-validator.service';

@CommandHandler(UpdateEndpointCommand)
export class UpdateEndpointHandler
  implements ICommandHandler<UpdateEndpointCommand, EndpointEntity>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    private readonly urlValidator: EndpointUrlValidatorService,
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  async execute(command: UpdateEndpointCommand): Promise<EndpointEntity> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    if (command.url !== undefined) {
      const validation = this.urlValidator.validate(command.url);
      if (!validation.valid) {
        throw new BadRequestException(
          `Invalid endpoint URL: ${validation.reason}`,
        );
      }
      endpoint.url = command.url;
    }
    if (command.name !== undefined) {
      endpoint.name = command.name;
    }
    if (command.description !== undefined) {
      endpoint.description = command.description;
    }
    if (command.timeoutMs !== undefined) {
      endpoint.timeoutMs = command.timeoutMs;
    }

    return this.repository.save(endpoint);
  }
}
