import { DeliveryEntity } from '../entities/delivery.entity';

export interface DeliveryListItem extends DeliveryEntity {
  isTest: boolean;
  testTargetEndpointId: string | null;
}

