import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryRequestedMessageV4 } from '@relayforge/kafka-contracts';
import { encryptSigningSecret } from '@relayforge/webhook-signing';
import { DeadLetterPublisherService } from './dead-letter-publisher.service';
import { DeliveriesSqlRepository } from './deliveries-sql.repository';
import { DeliveryConsumerService } from './delivery-consumer.service';
import { RetryPolicyService } from './retry-policy.service';
import { RetryPublisherService } from './retry-publisher.service';
import { WebhookSenderService } from './webhook-sender.service';

describe('DeliveryConsumerService', () => {
  const encryptionKey = Buffer.alloc(32, 5);
  const workerKey = Buffer.alloc(32, 6);
  const secret = 'rfs_do_not_leak_this_secret';
  const envelope = encryptSigningSecret(secret, encryptionKey);
  const baseMessage: DeliveryRequestedMessageV4 = {
    version: 4,
    jobId: 'run_123:1',
    projectId: 'project_123',
    runId: 'run_123',
    runNumber: 1,
    attemptNumber: 1,
    runAttemptNumber: 1,
    scheduledAt: '2026-08-27T12:00:00.000Z',
    deliveryId: 'delivery_123',
    eventId: 'event_123',
    endpointId: 'endpoint_123',
    eventType: 'order.completed',
    eventCreatedAt: '2026-08-27T12:00:00.000Z',
    data: { orderId: 'ORD-123' },
    endpointUrl: 'https://example.com/webhook',
    endpointTimeoutMs: 1000,
    endpointSigningSecretEncrypted: envelope,
    endpointSigningSecretVersion: 1,
  };

  function setup() {
    let eachMessage:
      | ((input: {
          topic: string;
          partition: number;
          message: { offset: string; value: Buffer };
        }) => Promise<void>)
      | undefined;
    const consumer = {
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn().mockImplementation((options) => {
        eachMessage = options.eachMessage;
      }),
      commitOffsets: jest.fn(),
      disconnect: jest.fn(),
    };
    const webhookSender = {
      send: jest.fn(),
    } as unknown as WebhookSenderService;
    const repository = {
      claimAttempt: jest.fn(),
    } as unknown as DeliveriesSqlRepository;
    const service = new DeliveryConsumerService(
      { kafka: { consumer: () => consumer } } as any,
      { ensureTopics: jest.fn() } as any,
      webhookSender,
      repository,
      new RetryPolicyService(new ConfigService({ delivery: { maxAttempts: 5 } })),
      { schedule: jest.fn() } as unknown as RetryPublisherService,
      { publish: jest.fn() } as unknown as DeadLetterPublisherService,
      new ConfigService({
        delivery: {
          processingLeaseMs: 1000,
          sensitiveHeaders: ['x-relayforge-signature'],
        },
        signing: { encryptionKey: workerKey },
      }),
    );
    return {
      consumer,
      repository,
      service,
      webhookSender,
      handler: () => {
        if (!eachMessage) throw new Error('consumer handler was not registered');
        return eachMessage;
      },
    };
  }

  const unauthenticatableMessages: Array<[string, DeliveryRequestedMessageV4]> = [
    ['wrong encryption key', baseMessage],
    [
      'tampered envelope',
      {
        ...baseMessage,
        endpointSigningSecretEncrypted: `${envelope.slice(0, -1)}${
          envelope.endsWith('A') ? 'B' : 'A'
        }`,
      },
    ],
  ];

  it.each(unauthenticatableMessages)(
    'does not send, claim, or commit offsets when v4 signing material fails authentication because of %s',
    async (_label, message) => {
      const context = setup();
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      await context.service.onModuleInit();

      await expect(
        context.handler()({
          topic: 'relayforge.deliveries',
          partition: 0,
          message: {
            offset: '9',
            value: Buffer.from(JSON.stringify(message)),
          },
        }),
      ).rejects.toThrow('Signing-secret envelope could not be authenticated');

      expect(context.webhookSender.send).not.toHaveBeenCalled();
      expect(context.repository.claimAttempt).not.toHaveBeenCalled();
      expect(context.consumer.commitOffsets).not.toHaveBeenCalled();
      const diagnostics = logError.mock.calls.flat().join(' ');
      expect(diagnostics).toContain(message.deliveryId);
      expect(diagnostics).not.toContain(secret);
      expect(diagnostics).not.toContain(message.endpointSigningSecretEncrypted);
      logError.mockRestore();
    },
  );
});
