export const EVENTS_TOPIC = 'relayforge.events';
export const DELIVERIES_TOPIC = 'relayforge.deliveries';
export const DLQ_TOPIC = 'relayforge.dlq';
export const RETRY_30S_TOPIC = 'relayforge.retry.30s';
export const RETRY_2M_TOPIC = 'relayforge.retry.2m';
export const RETRY_10M_TOPIC = 'relayforge.retry.10m';
export const RETRY_1H_TOPIC = 'relayforge.retry.1h';

export const RETRY_TOPICS = [
  RETRY_30S_TOPIC,
  RETRY_2M_TOPIC,
  RETRY_10M_TOPIC,
  RETRY_1H_TOPIC,
] as const;

export const ROUTING_CONSUMER_GROUP = 'relayforge-routing-consumers';
export const DELIVERY_CONSUMER_GROUP = 'relayforge-delivery-consumers';
export const RETRY_CONSUMER_GROUP = 'relayforge-retry-consumers';
