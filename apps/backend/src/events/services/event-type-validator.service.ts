import { Injectable } from '@nestjs/common';

const EVENT_TYPE_REGEX = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

@Injectable()
export class EventTypeValidatorService {
  isValid(eventType: string): boolean {
    return EVENT_TYPE_REGEX.test(eventType);
  }
}
