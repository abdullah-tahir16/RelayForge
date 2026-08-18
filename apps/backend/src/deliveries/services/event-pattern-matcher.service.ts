import { Injectable } from '@nestjs/common';

@Injectable()
export class EventPatternMatcherService {
  /** Exact patterns must equal the event type; `*` matches anything; `prefix.*` matches exactly one more segment. */
  matches(eventType: string, pattern: string): boolean {
    if (pattern === '*') {
      return true;
    }
    if (!pattern.endsWith('.*')) {
      return eventType === pattern;
    }

    const prefixSegments = pattern.slice(0, -2).split('.');
    const eventSegments = eventType.split('.');
    if (eventSegments.length !== prefixSegments.length + 1) {
      return false;
    }
    return prefixSegments.every((segment, i) => segment === eventSegments[i]);
  }
}
