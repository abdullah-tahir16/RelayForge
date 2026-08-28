import { EventEntity, EventStatus } from '../entities/event.entity';
import { endpointTestTargetId } from '../services/event-source';

export interface EventDetailResponse {
  id: string;
  event: string;
  status: EventStatus;
  createdAt: Date;
  publishedAt: Date | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  isTest: boolean;
  testTargetEndpointId: string | null;
}

export function toEventDetailResponse(
  entity: EventEntity,
): EventDetailResponse {
  const testTargetEndpointId = endpointTestTargetId(entity);
  return {
    id: entity.id,
    event: entity.eventType,
    status: entity.status,
    createdAt: entity.createdAt,
    publishedAt: entity.publishedAt,
    payload: entity.payload,
    metadata: entity.metadata,
    isTest: testTargetEndpointId !== null,
    testTargetEndpointId,
  };
}
