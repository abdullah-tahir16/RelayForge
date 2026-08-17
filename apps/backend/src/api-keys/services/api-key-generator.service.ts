import { Injectable } from '@nestjs/common';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../common/crypto/opaque-token.util';

const KEY_LIVE_PREFIX = 'rf_live_';
const PREFIX_VISIBLE_CHARS = 4;

export interface GeneratedApiKey {
  key: string;
  hash: string;
  prefix: string;
}

@Injectable()
export class ApiKeyGeneratorService {
  generate(): GeneratedApiKey {
    const { raw } = generateOpaqueToken(16);
    const key = `${KEY_LIVE_PREFIX}${raw}`;
    return {
      key,
      hash: hashOpaqueToken(key),
      prefix: key.slice(0, KEY_LIVE_PREFIX.length + PREFIX_VISIBLE_CHARS),
    };
  }
}
