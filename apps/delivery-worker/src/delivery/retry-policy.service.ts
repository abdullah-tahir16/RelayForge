import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RETRY_10M_TOPIC,
  RETRY_1H_TOPIC,
  RETRY_2M_TOPIC,
  RETRY_30S_TOPIC,
  RetryStage,
} from '@relayforge/kafka-contracts';

const DEFAULT_RETRY_TOPICS = [
  RETRY_30S_TOPIC,
  RETRY_2M_TOPIC,
  RETRY_10M_TOPIC,
  RETRY_1H_TOPIC,
];

export interface NextRetry {
  /** @deprecated Use nextRunAttemptNumber; retained for compatibility. */
  nextAttemptNumber: number;
  nextRunAttemptNumber: number;
  delayMs: number;
  stage: RetryStage;
  topic: string;
}

@Injectable()
export class RetryPolicyService {
  readonly retryDelaysMs: number[];
  readonly maxAttempts: number;
  readonly retryTopics: string[];

  constructor(configService: ConfigService) {
    this.retryDelaysMs = configService.get<number[]>('delivery.retryDelaysMs', [
      30_000,
      120_000,
      600_000,
      3_600_000,
    ]);
    this.maxAttempts = configService.get<number>('delivery.maxAttempts', 5);
    this.retryTopics = configService.get<string[]>(
      'kafka.retryTopics',
      DEFAULT_RETRY_TOPICS,
    );
  }

  nextAfter(completedAttemptNumber: number): NextRetry | null {
    if (completedAttemptNumber >= this.maxAttempts) {
      return null;
    }
    const stage = completedAttemptNumber as RetryStage;
    const delayMs = this.retryDelaysMs[stage - 1];
    const topic = this.retryTopics[stage - 1];
    if (!delayMs || !topic) {
      throw new Error(`No retry stage configured after attempt ${completedAttemptNumber}`);
    }
    return {
      nextAttemptNumber: completedAttemptNumber + 1,
      nextRunAttemptNumber: completedAttemptNumber + 1,
      delayMs,
      stage,
      topic,
    };
  }
}
