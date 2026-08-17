import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscribeEndpointCommand } from '../impl/subscribe-endpoint.command';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { EventPatternValidatorService } from '../../services/event-pattern-validator.service';
import { EndpointAuthorizationService } from '../../../endpoints/services/endpoint-authorization.service';

@CommandHandler(SubscribeEndpointCommand)
export class SubscribeEndpointHandler
  implements ICommandHandler<SubscribeEndpointCommand, SubscriptionEntity>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    private readonly eventPatternValidatorService: EventPatternValidatorService,
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async execute(
    command: SubscribeEndpointCommand,
  ): Promise<SubscriptionEntity> {
    const endpoint = await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    if (!this.eventPatternValidatorService.isValid(command.eventPattern)) {
      throw new BadRequestException('Invalid event pattern');
    }

    return this.repository.save(
      this.repository.create({
        endpointId: endpoint.id,
        eventPattern: command.eventPattern,
      }),
    );
  }
}
