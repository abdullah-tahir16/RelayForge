import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnsubscribeCommand } from '../impl/unsubscribe.command';
import { SubscriptionEntity } from '../../entities/subscription.entity';
import { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import { EndpointAuthorizationService } from '../../../endpoints/services/endpoint-authorization.service';

@CommandHandler(UnsubscribeCommand)
export class UnsubscribeHandler
  implements ICommandHandler<UnsubscribeCommand, void>
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  async execute(command: UnsubscribeCommand): Promise<void> {
    const subscription = await this.subscriptionsRepository.findById(
      command.subscriptionId,
    );
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Throws NotFoundException itself if the caller doesn't own this endpoint's project.
    await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      subscription.endpointId,
    );

    await this.repository.delete(subscription.id);
  }
}
