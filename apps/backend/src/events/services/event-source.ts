import { EventEntity, EventSource } from '../entities/event.entity';

export const ENDPOINT_TEST_EVENT_TYPE = 'relayforge.endpoint.test';

export interface EndpointTestPayload extends Record<string, unknown> {
  message: string;
  endpointId: string;
  sentAt: string;
}

export function buildEndpointTestPayload(
  endpointId: string,
  sentAt = new Date(),
): EndpointTestPayload {
  return {
    message: 'RelayForge endpoint test delivery',
    endpointId,
    sentAt: sentAt.toISOString(),
  };
}

export function isEndpointTestMetadata(
  metadata: Record<string, unknown> | null,
): boolean {
  return metadata?.source === EventSource.ENDPOINT_TEST;
}

export function endpointTestTargetId(
  event: Pick<EventEntity, 'source' | 'testTargetEndpointId'>,
): string | null {
  return event.source === EventSource.ENDPOINT_TEST
    ? event.testTargetEndpointId
    : null;
}
