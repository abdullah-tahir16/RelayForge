import { EventEntity, EventStatus } from '../entities/event.entity';

export interface EventDetailResponse {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: Date;
  publishedAt: Date | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export function toEventDetailResponse(
  entity: EventEntity,
): EventDetailResponse {
  return {
    id: entity.id,
    event: entity.eventType,
    status: entity.status,
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt,
    payload: entity.payload,
    metadata: entity.metadata,
  };
}
