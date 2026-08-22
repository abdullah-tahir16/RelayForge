import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DeliveryRetryScheduledMessage } from '@relayforge/kafka-contracts';
import { Admin, Consumer, Kafka } from 'kafkajs';
import { KafkaClientService } from '../kafka/kafka-client.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { KafkaTopicsService } from '../kafka/kafka-topics.service';
import { RetryConsumerService } from './retry-consumer.service';

const BROKERS = (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(',');

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = 15_000,
  intervalMs = 50,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

describe('RetryConsumerService (Kafka integration)', () => {
  const suffix = randomUUID();
  const deliveriesTopic = `relayforge.test.deliveries.${suffix}`;
  const retryTopic = `relayforge.test.retry.${suffix}`;
  const retryConsumerGroup = `relayforge-test-retry-${suffix}`;
  const observerGroup = `relayforge-test-observer-${suffix}`;

  let admin: Admin;
  let observer: Consumer;
  let client: KafkaClientService;
  let topics: KafkaTopicsService;
  let producer: KafkaProducerService;
  let retryConsumer: RetryConsumerService;
  const observed: DeliveryRetryScheduledMessage['delivery'][] = [];

  const config = new ConfigService({
    kafka: {
      brokers: BROKERS,
      deliveriesTopic,
      retryTopics: [retryTopic],
      retryConsumerGroup,
    },
  });

  function payload(jobId: string, notBefore: Date): DeliveryRetryScheduledMessage {
    return {
      version: 1,
      stage: 1,
      notBefore: notBefore.toISOString(),
      delivery: {
        version: 2,
        jobId,
        projectId: 'integration-project',
        attemptNumber: 2,
        scheduledAt: notBefore.toISOString(),
        deliveryId: 'integration-delivery',
        eventId: 'integration-event',
        endpointId: 'integration-endpoint',
        eventType: 'order.completed',
        eventCreatedAt: new Date().toISOString(),
        data: {},
        endpointUrl: 'https://example.com',
        endpointTimeoutMs: 1000,
      },
    };
  }

  async function startRetryConsumer(
    publisher: KafkaProducerService = producer,
  ): Promise<RetryConsumerService> {
    const service = new RetryConsumerService(client, topics, publisher, config);
    await service.onModuleInit();
    await waitFor(async () => {
      const result = await admin.describeGroups([retryConsumerGroup]);
      const group = result.groups[0];
      return group?.state === 'Stable' && group.members.length > 0;
    });
    return service;
  }

  beforeAll(async () => {
    client = new KafkaClientService(config);
    topics = new KafkaTopicsService(client, config);
    producer = new KafkaProducerService(client);
    await topics.ensureTopics();
    await producer.onModuleInit();

    const kafka = new Kafka({ clientId: `relayforge-test-${suffix}`, brokers: BROKERS });
    admin = kafka.admin();
    observer = kafka.consumer({ groupId: observerGroup });
    await admin.connect();
    await observer.connect();
    await observer.subscribe({ topic: deliveriesTopic, fromBeginning: true });
    await observer.run({
      eachMessage: async ({ message }) => {
        if (message.value) observed.push(JSON.parse(message.value.toString()));
      },
    });

    retryConsumer = await startRetryConsumer();
  }, 30_000);

  afterAll(async () => {
    await retryConsumer?.onModuleDestroy();
    await observer?.disconnect();
    await producer?.onModuleDestroy();
    await admin?.deleteTopics({ topics: [deliveriesTopic, retryTopic] });
    await admin?.disconnect();
  }, 30_000);

  it('holds future work, resumes its partition, and republishes duplicate jobs', async () => {
    const dueAt = new Date(Date.now() + 750);
    const scheduled = payload(`future-${suffix}`, dueAt);
    const before = observed.length;

    await producer.publish(retryTopic, scheduled.delivery.projectId, scheduled);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(observed).toHaveLength(before);

    await waitFor(() => observed.length === before + 1);
    expect(observed[before].jobId).toBe(scheduled.delivery.jobId);
    expect(Date.now()).toBeGreaterThanOrEqual(dueAt.getTime());

    await producer.publish(retryTopic, scheduled.delivery.projectId, {
      ...scheduled,
      notBefore: new Date(0).toISOString(),
    });
    await waitFor(() => observed.length === before + 2);
    expect(observed.slice(before).map((job) => job.jobId)).toEqual([
      scheduled.delivery.jobId,
      scheduled.delivery.jobId,
    ]);
  }, 20_000);

  it('leaves a future offset uncommitted across restart', async () => {
    const scheduled = payload(`restart-${suffix}`, new Date(Date.now() + 1500));
    const before = observed.length;
    await producer.publish(retryTopic, scheduled.delivery.projectId, scheduled);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(observed).toHaveLength(before);

    await retryConsumer.onModuleDestroy();
    retryConsumer = await startRetryConsumer();

    await waitFor(() => observed.length === before + 1);
    expect(observed[before].jobId).toBe(scheduled.delivery.jobId);
  }, 20_000);

  it('does not commit when publishing fails, then replays after restart', async () => {
    await retryConsumer.onModuleDestroy();
    const failedPublisher = {
      publish: jest.fn().mockRejectedValue(new Error('simulated publish failure')),
    } as unknown as KafkaProducerService;
    retryConsumer = await startRetryConsumer(failedPublisher);

    const scheduled = payload(`publish-failure-${suffix}`, new Date(0));
    const before = observed.length;
    await producer.publish(retryTopic, scheduled.delivery.projectId, scheduled);
    await waitFor(() => (failedPublisher.publish as jest.Mock).mock.calls.length > 0);
    await retryConsumer.onModuleDestroy();
    expect(observed).toHaveLength(before);

    retryConsumer = await startRetryConsumer();
    await waitFor(() => observed.length === before + 1);
    expect(observed[before].jobId).toBe(scheduled.delivery.jobId);
  }, 25_000);
});
