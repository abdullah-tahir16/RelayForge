import { EventDetail } from '../../../../core/types/Event';
import { Delivery } from '../../../../core/types/Delivery';

export interface TimelineEntry {
  label: string;
  timestamp: string;
}

export function buildTimeline(
  event: EventDetail,
  deliveries: Delivery[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { label: 'Event created', timestamp: event.createdAt },
  ];

  if (event.publishedAt) {
    entries.push({ label: 'Event published', timestamp: event.publishedAt });
  }

  for (const delivery of deliveries) {
    if (delivery.completedAt) {
      entries.push({
        label: `Delivery to endpoint ${delivery.endpointId} succeeded`,
        timestamp: delivery.completedAt,
      });
    }
    if (delivery.failedAt) {
      entries.push({
        label: `Delivery to endpoint ${delivery.endpointId} failed`,
        timestamp: delivery.failedAt,
      });
    }
  }

  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
