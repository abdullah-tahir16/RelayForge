import { Injectable } from '@nestjs/common';

const EVENT_PATTERN_REGEX = /^\*$|^[a-z0-9]+(\.[a-z0-9]+)*(\.\*)?$/;

@Injectable()
export class EventPatternValidatorService {
  isValid(pattern: string): boolean {
    return EVENT_PATTERN_REGEX.test(pattern);
  }
}
