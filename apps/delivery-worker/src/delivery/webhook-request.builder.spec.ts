import { buildWebhookRequest } from './webhook-request.builder';
import {
  DeliveryRequestedMessageV1,
  DeliveryRequestedMessageV4,
  normalizeDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import {
  encryptSigningSecret,
  verifyWebhookSignature,
} from '@relayforge/webhook-signing';

describe('buildWebhookRequest', () => {
  const key = Buffer.alloc(32, 4);
  const message: DeliveryRequestedMessageV1 = {
    version: 1,
    deliveryId: 'del_123',
    eventId: 'evt_123',
    endpointId: 'end_123',
    eventType: 'order.completed',
    eventCreatedAt: '2026-08-17T14:30:00.000Z',
    data: { orderId: 'ORD-123' },
    endpointUrl: 'https://example.com/webhook',
    endpointTimeoutMs: 10000,
  };

  it('targets the endpoint URL and honors its timeout', () => {
    const request = buildWebhookRequest(
      normalizeDeliveryRequestedMessage(message),
      key,
    );
    expect(request.url).toBe('https://example.com/webhook');
    expect(request.timeoutMs).toBe(10000);
  });

  it('sets the documented RelayForge headers', () => {
    const request = buildWebhookRequest(
      normalizeDeliveryRequestedMessage(message),
      key,
    );
    expect(request.headers['X-RelayForge-Event']).toBe('order.completed');
    expect(request.headers['X-RelayForge-Event-Id']).toBe('evt_123');
    expect(request.headers['X-RelayForge-Delivery-Id']).toBe('del_123');
    expect(request.headers['X-RelayForge-Timestamp']).toMatch(/^\d+$/);
    expect(request.headers).not.toHaveProperty('X-RelayForge-Signature');
  });

  it('builds a JSON body carrying the event envelope and data', () => {
    const request = buildWebhookRequest(
      normalizeDeliveryRequestedMessage(message),
      key,
    );
    expect(JSON.parse(request.body)).toEqual({
      id: 'evt_123',
      event: 'order.completed',
      createdAt: '2026-08-17T14:30:00.000Z',
      data: { orderId: 'ORD-123' },
    });
  });

  it('signs the exact body and captured timestamp for v4 jobs', () => {
    const secret = 'rfs_test_secret';
    const v4: DeliveryRequestedMessageV4 = {
      ...message,
      version: 4,
      jobId: 'run:1',
      projectId: 'project',
      runId: 'run',
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: '2026-08-27T12:00:00.000Z',
      endpointSigningSecretEncrypted: encryptSigningSecret(secret, key),
      endpointSigningSecretVersion: 2,
    };
    const request = buildWebhookRequest(
      normalizeDeliveryRequestedMessage(v4),
      key,
      1_786_977_000_999,
    );
    expect(request.headers['X-RelayForge-Timestamp']).toBe('1786977000');
    expect(request.headers['X-RelayForge-Signature']).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(
      verifyWebhookSignature(
        secret,
        request.headers['X-RelayForge-Timestamp'],
        request.body,
        request.headers['X-RelayForge-Signature'],
      ),
    ).toBe(true);
    expect(
      verifyWebhookSignature(
        secret,
        request.headers['X-RelayForge-Timestamp'],
        `${request.body} `,
        request.headers['X-RelayForge-Signature'],
      ),
    ).toBe(false);

    const resent = buildWebhookRequest(
      normalizeDeliveryRequestedMessage(v4),
      key,
      1_786_977_010_000,
    );
    expect(resent.headers['X-RelayForge-Timestamp']).not.toBe(
      request.headers['X-RelayForge-Timestamp'],
    );
    expect(resent.headers['X-RelayForge-Signature']).not.toBe(
      request.headers['X-RelayForge-Signature'],
    );
  });

  it('fails closed for malformed v4 signing material', () => {
    const v4 = normalizeDeliveryRequestedMessage({
      ...message,
      version: 4,
      jobId: 'run:1',
      projectId: 'project',
      runId: 'run',
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: '2026-08-27T12:00:00.000Z',
      endpointSigningSecretEncrypted: 'v1.invalid.cipher.tag',
      endpointSigningSecretVersion: 1,
    });
    expect(() => buildWebhookRequest(v4, key)).toThrow(
      'Signing-secret envelope could not be authenticated',
    );
  });

  it('fails closed when v4 signing material was encrypted with another key', () => {
    const v4 = normalizeDeliveryRequestedMessage({
      ...message,
      version: 4,
      jobId: 'run:1',
      projectId: 'project',
      runId: 'run',
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: '2026-08-27T12:00:00.000Z',
      endpointSigningSecretEncrypted: encryptSigningSecret(
        'rfs_test_secret',
        Buffer.alloc(32, 8),
      ),
      endpointSigningSecretVersion: 1,
    });
    expect(() => buildWebhookRequest(v4, key)).toThrow(
      'Signing-secret envelope could not be authenticated',
    );
  });
});
