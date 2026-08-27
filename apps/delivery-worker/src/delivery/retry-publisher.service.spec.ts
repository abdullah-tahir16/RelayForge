import {
  DeliveryRequestedMessageV3,
  DeliveryRequestedMessageV4,
  normalizeDeliveryRequestedMessage,
} from '@relayforge/kafka-contracts';
import { RetryPublisherService } from './retry-publisher.service';

const base = {
  jobId: 'run:1',
  projectId: 'project',
  runId: 'run',
  runNumber: 1,
  attemptNumber: 1,
  runAttemptNumber: 1,
  scheduledAt: '2026-08-27T12:00:00.000Z',
  deliveryId: 'delivery',
  eventId: 'event',
  endpointId: 'endpoint',
  eventType: 'order.completed',
  eventCreatedAt: '2026-08-27T11:00:00.000Z',
  data: { orderId: 'order' },
  endpointUrl: 'https://example.test/hook',
  endpointTimeoutMs: 10_000,
};

describe('RetryPublisherService', () => {
  it('preserves a v4 encrypted snapshot without introducing plaintext', async () => {
    const producer = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new RetryPublisherService(producer as never);
    const current: DeliveryRequestedMessageV4 = {
      ...base,
      version: 4,
      endpointSigningSecretEncrypted: 'v1.nonce.ciphertext.tag',
      endpointSigningSecretVersion: 7,
    };
    await service.schedule(
      normalizeDeliveryRequestedMessage(current),
      'project',
      {
        stage: 1,
        topic: 'retry',
        delayMs: 30_000,
        nextAttemptNumber: 2,
        nextRunAttemptNumber: 2,
      },
      new Date('2026-08-27T12:00:30.000Z'),
      { id: 'run', number: 1 },
    );
    const scheduled = producer.publish.mock.calls[0][2];
    expect(scheduled.delivery).toMatchObject({
      version: 4,
      attemptNumber: 2,
      runAttemptNumber: 2,
      endpointSigningSecretEncrypted: 'v1.nonce.ciphertext.tag',
      endpointSigningSecretVersion: 7,
    });
    expect(JSON.stringify(scheduled)).not.toMatch(/"signingSecret"|rfs_/);
  });

  it('keeps v3 retries unsigned', async () => {
    const producer = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new RetryPublisherService(producer as never);
    const current: DeliveryRequestedMessageV3 = { ...base, version: 3 };
    await service.schedule(
      normalizeDeliveryRequestedMessage(current),
      'project',
      {
        stage: 1,
        topic: 'retry',
        delayMs: 30_000,
        nextAttemptNumber: 2,
        nextRunAttemptNumber: 2,
      },
      new Date('2026-08-27T12:00:30.000Z'),
      { id: 'run', number: 1 },
    );
    expect(producer.publish.mock.calls[0][2].delivery).toMatchObject({
      version: 3,
      attemptNumber: 2,
    });
    expect(producer.publish.mock.calls[0][2].delivery).not.toHaveProperty(
      'endpointSigningSecretEncrypted',
    );
  });
});
