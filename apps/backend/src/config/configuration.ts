import { parseSigningEncryptionKey } from '@relayforge/webhook-signing';

export interface AppConfig {
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    accessExpiresIn: string;
    refreshExpiresDays: number;
  };
  kafka: {
    brokers: string[];
    routingConsumerGroup: string;
    routingFromBeginning: boolean;
  };
  events: {
    maxPayloadBytes: number;
  };
  signing: {
    encryptionKey: Buffer;
  };
}

const DEVELOPMENT_SIGNING_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgres://relayforge:relayforge@localhost:5432/relayforge',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresDays: parseInt(
      process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30',
      10,
    ),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(','),
    routingConsumerGroup:
      process.env.KAFKA_ROUTING_CONSUMER_GROUP ??
      'relayforge-routing-consumers',
    routingFromBeginning:
      process.env.KAFKA_ROUTING_FROM_BEGINNING === 'true',
  },
  events: {
    maxPayloadBytes: parseInt(
      process.env.EVENTS_MAX_PAYLOAD_BYTES ?? String(256 * 1024),
      10,
    ),
  },
  signing: {
    encryptionKey: parseSigningEncryptionKey(
      process.env.SIGNING_SECRET_ENCRYPTION_KEY ??
        (process.env.NODE_ENV === 'production'
          ? undefined
          : DEVELOPMENT_SIGNING_KEY),
    ),
  },
});
