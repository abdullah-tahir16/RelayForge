import {
  DeliveryRequestedMessageV2,
  DeliveryRequestedMessageV3,
  DeliveryRequestedMessageV4,
} from './delivery-requested.message';

export type RetryStage = 1 | 2 | 3 | 4;

export interface DeliveryRetryScheduledMessage {
  version: 1;
  stage: RetryStage;
  notBefore: string;
  delivery:
    | DeliveryRequestedMessageV2
    | DeliveryRequestedMessageV3
    | DeliveryRequestedMessageV4;
}
