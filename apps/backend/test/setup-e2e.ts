process.env.KAFKA_ROUTING_CONSUMER_GROUP =
  process.env.KAFKA_ROUTING_CONSUMER_GROUP ??
  `relayforge-routing-e2e-${process.pid}`;
process.env.KAFKA_ROUTING_FROM_BEGINNING = 'true';
