import { DeliveryRequestedMessage } from '@relayforge/kafka-contracts';

export interface WebhookRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
}

export function buildWebhookRequest(
  message: DeliveryRequestedMessage,
): WebhookRequest {
  const body = JSON.stringify({
    id: message.eventId,
    event: message.eventType,
    createdAt: message.eventCreatedAt,
    data: message.data,
  });

  return {
    url: message.endpointUrl,
    timeoutMs: message.endpointTimeoutMs,
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-RelayForge-Event': message.eventType,
      'X-RelayForge-Event-Id': message.eventId,
      'X-RelayForge-Delivery-Id': message.deliveryId,
      'X-RelayForge-Timestamp': String(Math.floor(Date.now() / 1000)),
    },
  };
}
