import { EventEntity, EventStatus } from '../entities/event.entity';

export interface EventResponse {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: Date;
}

export function toEventResponse(entity: EventEntity): EventResponse {
  return {
    id: entity.id,
    event: entity.eventType,
    status: entity.status,
    createdAt: entity.createdAt,
  };
}
