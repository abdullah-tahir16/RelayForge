import {
  DELIVERIES_TOPIC,
  DELIVERY_CONSUMER_GROUP,
  DLQ_TOPIC,
  RETRY_CONSUMER_GROUP,
  RETRY_TOPICS,
} from '@relayforge/kafka-contracts';
import { parseSigningEncryptionKey } from '@relayforge/webhook-signing';

export interface AppConfig {
  database: {
    url: string;
  };
  kafka: {
    brokers: string[];
    deliveriesTopic: string;
    dlqTopic: string;
    deliveryConsumerGroup: string;
    retryTopics: string[];
    retryConsumerGroup: string;
  };
  delivery: {
    retryDelaysMs: number[];
    maxAttempts: number;
    processingLeaseMs: number;
    responsePreviewMaxBytes: number;
    sensitiveHeaders: string[];
  };
  signing: {
    encryptionKey: Buffer;
  };
}

const DEFAULT_RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000];
const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'proxy-authenticate',
  'x-relayforge-signature',
];
const DEVELOPMENT_SIGNING_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received ${value}`);
  }
  return parsed;
}

export function parseRetryDelays(value?: string): number[] {
  if (!value) {
    return [...DEFAULT_RETRY_DELAYS_MS];
  }
  const delays = value.split(',').map((part) => Number(part.trim()));
  if (
    delays.length !== 4 ||
    delays.some((delay) => !Number.isSafeInteger(delay) || delay <= 0)
  ) {
    throw new Error('DELIVERY_RETRY_DELAYS_MS must contain four positive integers');
  }
  return delays;
}

export default (): AppConfig => {
  const retryDelaysMs = parseRetryDelays(process.env.DELIVERY_RETRY_DELAYS_MS);
  const maxAttempts = parsePositiveInteger(
    process.env.DELIVERY_MAX_ATTEMPTS,
    retryDelaysMs.length + 1,
  );
  if (maxAttempts > retryDelaysMs.length + 1) {
    throw new Error('DELIVERY_MAX_ATTEMPTS exceeds the configured retry stages');
  }

  return {
    database: {
      url:
        process.env.DATABASE_URL ??
        'postgres://relayforge:relayforge@localhost:5432/relayforge',
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(','),
      deliveriesTopic: process.env.KAFKA_DELIVERIES_TOPIC ?? DELIVERIES_TOPIC,
      dlqTopic: process.env.KAFKA_DLQ_TOPIC ?? DLQ_TOPIC,
      deliveryConsumerGroup:
        process.env.KAFKA_DELIVERY_CONSUMER_GROUP ?? DELIVERY_CONSUMER_GROUP,
      retryTopics: process.env.KAFKA_RETRY_TOPICS
        ? process.env.KAFKA_RETRY_TOPICS.split(',').map((topic) => topic.trim())
        : [...RETRY_TOPICS],
      retryConsumerGroup:
        process.env.KAFKA_RETRY_CONSUMER_GROUP ?? RETRY_CONSUMER_GROUP,
    },
    delivery: {
      retryDelaysMs,
      maxAttempts,
      processingLeaseMs: parsePositiveInteger(
        process.env.DELIVERY_PROCESSING_LEASE_MS,
        45_000,
      ),
      responsePreviewMaxBytes: parsePositiveInteger(
        process.env.DELIVERY_RESPONSE_PREVIEW_MAX_BYTES,
        4_096,
      ),
      sensitiveHeaders: (
        process.env.DELIVERY_SENSITIVE_HEADERS ??
        DEFAULT_SENSITIVE_HEADERS.join(',')
      )
        .split(',')
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean),
    },
    signing: {
      encryptionKey: parseSigningEncryptionKey(
        process.env.SIGNING_SECRET_ENCRYPTION_KEY ??
          (process.env.NODE_ENV === 'production'
            ? undefined
            : DEVELOPMENT_SIGNING_KEY),
      ),
    },
  };
};
