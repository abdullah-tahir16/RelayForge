import { Delivery } from '../../core/types/Delivery';
import { EventListItem } from '../../core/types/Event';
import { NON_TERMINAL_DELIVERY_STATUSES } from '../../core/types/Delivery';

export const DETAIL_POLL_INTERVAL_MS = 2_000;
export const LIST_POLL_INTERVAL_MS = 5_000;

export function eventListPollingInterval(
  items: EventListItem[] | undefined,
): number | false {
  return !items ||
    items.some((event) =>
      ['ACCEPTED', 'PUBLISHED', 'PROCESSING'].includes(event.status),
    )
    ? LIST_POLL_INTERVAL_MS
    : false;
}

export function deliveryPollingInterval(
  items: Delivery[] | undefined,
): number | false {
  return !items ||
    items.some((delivery) =>
      NON_TERMINAL_DELIVERY_STATUSES.includes(delivery.status),
    )
    ? DETAIL_POLL_INTERVAL_MS
    : false;
}
