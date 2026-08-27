import {
  deadLetterId,
  deliveryJobId,
  DeliveryDeadLetteredMessageV1,
  DeliveryRequestedMessageV1,
  DeliveryRequestedMessageV2,
  DeliveryRequestedMessageV3,
  DeliveryRequestedMessageV4,
  DLQ_TOPIC,
  normalizeDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';

const base = {
  deliveryId: 'delivery-id',
  eventId: 'event-id',
  endpointId: 'endpoint-id',
  eventType: 'invoice.created',
  eventCreatedAt: '2026-08-23T10:00:00.000Z',
  data: { invoiceId: 'invoice-id' },
  endpointUrl: 'https://example.test/webhook',
  endpointTimeoutMs: 5_000,
};

describe('delivery message contracts', () => {
  it('normalizes retained v1 and v2 jobs while preserving their source version', () => {
    const v1: DeliveryRequestedMessageV1 = { ...base, version: 1 };
    const v2: DeliveryRequestedMessageV2 = {
      ...base,
      version: 2,
      jobId: 'delivery-id:2',
      projectId: 'project-id',
      attemptNumber: 2,
      scheduledAt: '2026-08-23T10:01:00.000Z',
    };

    expect(normalizeDeliveryRequestedMessage(v1)).toMatchObject({
      version: 2,
      sourceVersion: 1,
      jobId: 'delivery-id:1',
      attemptNumber: 1,
    });
    expect(normalizeDeliveryRequestedMessage(v2)).toMatchObject({
      sourceVersion: 2,
      jobId: 'delivery-id:2',
      attemptNumber: 2,
    });
  });

  it('round-trips v3 run identity and uses a stable run-aware job id', () => {
    const v3: DeliveryRequestedMessageV3 = {
      ...base,
      version: 3,
      jobId: deliveryJobId('run-id', 1),
      projectId: 'project-id',
      runId: 'run-id',
      runNumber: 2,
      attemptNumber: 6,
      runAttemptNumber: 1,
      scheduledAt: '2026-08-23T10:02:00.000Z',
    };

    expect(normalizeDeliveryRequestedMessage(v3)).toEqual({
      ...v3,
      sourceVersion: 3,
    });
    expect(deliveryJobId('run-id', 1)).toBe('run-id:1');
    expect(deliveryJobId('run-id', 1)).toBe(deliveryJobId('run-id', 1));
  });

  it('round-trips v4 encrypted signing material without a plaintext field', () => {
    const v4: DeliveryRequestedMessageV4 = {
      ...base,
      version: 4,
      jobId: deliveryJobId('run-id', 1),
      projectId: 'project-id',
      runId: 'run-id',
      runNumber: 1,
      attemptNumber: 1,
      runAttemptNumber: 1,
      scheduledAt: '2026-08-27T10:02:00.000Z',
      endpointSigningSecretEncrypted: 'v1.nonce.ciphertext.tag',
      endpointSigningSecretVersion: 3,
    };
    expect(normalizeDeliveryRequestedMessage(v4)).toEqual({
      ...v4,
      sourceVersion: 4,
    });
    expect(JSON.stringify(v4)).toContain('endpointSigningSecretEncrypted');
    expect(JSON.stringify(v4)).not.toMatch(/"signingSecret"|rfs_/);
  });

  it('defines a stable secret-free dead-letter envelope', () => {
    const message: DeliveryDeadLetteredMessageV1 = {
      version: 1,
      deadLetterId: deadLetterId('run-id'),
      projectId: 'project-id',
      eventId: 'event-id',
      deliveryId: 'delivery-id',
      endpointId: 'endpoint-id',
      runId: 'run-id',
      runNumber: 1,
      attemptCount: 5,
      finalAttemptNumber: 5,
      finalRunAttemptNumber: 5,
      failureKind: 'HTTP',
      failureReason: 'HTTP_503',
      finalHttpStatus: 503,
      deadLetteredAt: '2026-08-23T10:05:00.000Z',
    };

    expect(message.deadLetterId).toBe(message.runId);
    expect(DLQ_TOPIC).toBe('relayforge.dlq');
    expect(JSON.stringify(message)).not.toMatch(
      /endpointUrl|data|headers|requestBody|responseBody|credentials/i,
    );
  });
});
