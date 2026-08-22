import { RETRY_30S_TOPIC } from '@relayforge/kafka-contracts';
import { ConfigService } from '@nestjs/config';
import { RetryConsumerService } from './retry-consumer.service';

describe('RetryConsumerService', () => {
  const delivery = {
    version: 2 as const,
    jobId: 'delivery:2',
    projectId: 'project',
    attemptNumber: 2,
    scheduledAt: new Date().toISOString(),
    deliveryId: 'delivery',
    eventId: 'event',
    endpointId: 'endpoint',
    eventType: 'order.completed',
    eventCreatedAt: new Date().toISOString(),
    data: {},
    endpointUrl: 'https://example.com',
    endpointTimeoutMs: 1000,
  };

  function setup() {
    let eachMessage: (input: any) => Promise<void>;
    const calls: string[] = [];
    const consumer = {
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn().mockImplementation((options) => {
        eachMessage = options.eachMessage;
      }),
      commitOffsets: jest.fn().mockImplementation(async () => calls.push('commit')),
      pause: jest.fn(),
      seek: jest.fn(),
      resume: jest.fn(),
      disconnect: jest.fn(),
    };
    const producer = {
      publish: jest.fn().mockImplementation(async () => calls.push('publish')),
    };
    const service = new RetryConsumerService(
      { kafka: { consumer: () => consumer } } as any,
      { ensureTopics: jest.fn() } as any,
      producer as any,
      new ConfigService(),
    );
    return { service, consumer, producer, calls, handler: () => eachMessage };
  }

  it('publishes a due job before committing its retry offset', async () => {
    const context = setup();
    await context.service.onModuleInit();
    const payload = { version: 1, stage: 1, notBefore: new Date(0).toISOString(), delivery };
    await context.handler()({
      topic: RETRY_30S_TOPIC,
      partition: 0,
      message: { offset: '4', value: Buffer.from(JSON.stringify(payload)) },
    });
    expect(context.calls).toEqual(['publish', 'commit']);
    expect(context.producer.publish).toHaveBeenCalledTimes(1);
  });

  it('pauses a future partition, seeks to the uncommitted offset, and resumes', async () => {
    jest.useFakeTimers();
    const context = setup();
    await context.service.onModuleInit();
    const payload = {
      version: 1,
      stage: 1,
      notBefore: new Date(Date.now() + 1000).toISOString(),
      delivery,
    };
    await context.handler()({
      topic: RETRY_30S_TOPIC,
      partition: 2,
      message: { offset: '8', value: Buffer.from(JSON.stringify(payload)) },
    });
    expect(context.consumer.pause).toHaveBeenCalled();
    expect(context.consumer.commitOffsets).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(context.consumer.seek).toHaveBeenCalledWith({
      topic: RETRY_30S_TOPIC,
      partition: 2,
      offset: '8',
    });
    expect(context.consumer.resume).toHaveBeenCalled();
    await context.service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('clears paused retry timers during worker shutdown', async () => {
    jest.useFakeTimers();
    const context = setup();
    await context.service.onModuleInit();
    const payload = {
      version: 1,
      stage: 1,
      notBefore: new Date(Date.now() + 1000).toISOString(),
      delivery,
    };
    await context.handler()({
      topic: RETRY_30S_TOPIC,
      partition: 1,
      message: { offset: '2', value: Buffer.from(JSON.stringify(payload)) },
    });
    await context.service.onModuleDestroy();
    jest.advanceTimersByTime(1000);
    expect(context.consumer.resume).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
