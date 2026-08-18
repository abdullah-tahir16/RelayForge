import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024;

@Injectable()
export class EventPayloadSizeValidatorService {
  constructor(private readonly configService: ConfigService) {}

  isWithinLimit(data: unknown): boolean {
    const maxBytes = this.configService.get<number>(
      'events.maxPayloadBytes',
      DEFAULT_MAX_PAYLOAD_BYTES,
    );
    return Buffer.byteLength(JSON.stringify(data ?? {}), 'utf8') <= maxBytes;
  }
}
