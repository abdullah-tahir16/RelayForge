export interface AppConfig {
  database: {
    url: string;
  };
  kafka: {
    brokers: string[];
  };
}

export default (): AppConfig => ({
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgres://relayforge:relayforge@localhost:5432/relayforge',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9094').split(','),
  },
});
