import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Consumer } from 'kafkajs';
import {
  EVENTS_TOPIC,
  EventPublishedMessage,
  ROUTING_CONSUMER_GROUP,
} from '@relayforge/kafka-contracts';
import { KafkaClientService } from '../../kafka/kafka-client.service';
import { KafkaTopicsService } from '../../kafka/kafka-topics.service';
import { RouteEventCommand } from '../commands/impl/route-event.command';

@Injectable()
export class RoutingConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoutingConsumerService.name);
  private consumer: Consumer;

  constructor(
    private readonly kafkaClient: KafkaClientService,
    private readonly kafkaTopics: KafkaTopicsService,
    private readonly commandBus: CommandBus,
    configService: ConfigService,
  ) {
    this.routingConsumerGroup = configService.get<string>(
      'kafka.routingConsumerGroup',
      ROUTING_CONSUMER_GROUP,
    );
    this.routingFromBeginning = configService.get<boolean>(
      'kafka.routingFromBeginning',
      false,
    );
  }

  private readonly routingConsumerGroup: string;
  private readonly routingFromBeginning: boolean;

  async onModuleInit(): Promise<void> {
    await this.kafkaTopics.ensureTopics();

    this.consumer = this.kafkaClient.kafka.consumer({
      groupId: this.routingConsumerGroup,
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: EVENTS_TOPIC,
      fromBeginning: this.routingFromBeginning,
    });

    const groupJoined = new Promise<void>((resolve) => {
      const removeListener = this.consumer.on(
        this.consumer.events.GROUP_JOIN,
        () => {
          removeListener();
          resolve();
        },
      );
    });

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) {
          return;
        }
        const payload = JSON.parse(
          message.value.toString(),
        ) as EventPublishedMessage;

        try {
          await this.commandBus.execute(new RouteEventCommand(payload.eventId));
        } catch (error) {
          this.logger.error(
            `Failed to route event ${payload.eventId}: ${error}`,
          );
          throw error;
        }

        await this.consumer.commitOffsets([
          { topic, partition, offset: (Number(message.offset) + 1).toString() },
        ]);
      },
    });

    // Do not report the API as ready until this consumer can receive newly
    // published events. This is especially important for a brand-new group,
    // whose initial offset is established when it joins.
    await groupJoined;
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }
}
