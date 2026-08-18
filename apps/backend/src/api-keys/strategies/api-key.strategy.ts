import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ApiKeysRepository } from '../repositories/api-keys.repository';
import { hashOpaqueToken } from '../../common/crypto/opaque-token.util';

export interface ApiKeyContext {
  apiKeyId: string;
  projectId: string;
}

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeysRepository: ApiKeysRepository) {
    super();
  }

  async validate(token: string): Promise<ApiKeyContext> {
    const apiKey = await this.apiKeysRepository.findByHash(
      hashOpaqueToken(token),
    );
    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }

    await this.apiKeysRepository.touchLastUsedAt(apiKey.id);

    return { apiKeyId: apiKey.id, projectId: apiKey.projectId };
  }
}
