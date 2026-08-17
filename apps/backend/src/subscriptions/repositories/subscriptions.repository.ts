import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repository: Repository<SubscriptionEntity>,
  ) {}

  findAllByEndpointId(endpointId: string): Promise<SubscriptionEntity[]> {
    return this.repository.find({ where: { endpointId } });
  }

  findById(id: string): Promise<SubscriptionEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
