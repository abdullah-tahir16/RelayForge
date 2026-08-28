import { EventStatus } from '../entities/event.entity';

export interface EventListItem {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: Date;
  deliveryTotal: number;
  deliverySucceeded: number;
  isTest: boolean;
  testTargetEndpointId: string | null;
}
