import { NormalizedDeliveryRequestedMessage } from '@relayforge/kafka-contracts';
import {
  decryptSigningSecret,
  signWebhook,
} from '@relayforge/webhook-signing';

export interface WebhookRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
}

export function buildWebhookRequest(
  message: NormalizedDeliveryRequestedMessage,
  encryptionKey: Buffer,
  nowMs = Date.now(),
): WebhookRequest {
  const body = JSON.stringify({
    id: message.eventId,
    event: message.eventType,
    createdAt: message.eventCreatedAt,
    data: message.data,
  });

  const timestamp = String(Math.floor(nowMs / 1000));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RelayForge-Event': message.eventType,
    'X-RelayForge-Event-Id': message.eventId,
    'X-RelayForge-Delivery-Id': message.deliveryId,
    'X-RelayForge-Timestamp': timestamp,
  };
  if (message.sourceVersion === 4) {
    if (
      !message.endpointSigningSecretEncrypted ||
      !message.endpointSigningSecretVersion
    ) {
      throw new Error('Signing-capable delivery job is missing signing material');
    }
    const secret = decryptSigningSecret(
      message.endpointSigningSecretEncrypted,
      encryptionKey,
    );
    headers['X-RelayForge-Signature'] = signWebhook(secret, timestamp, body);
  }

  return {
    url: message.endpointUrl,
    timeoutMs: message.endpointTimeoutMs,
    body,
    headers,
  };
}
