import { ApiKeyEntity } from '../entities/api-key.entity';

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string;
}

export function toApiKeyResponse(entity: ApiKeyEntity): ApiKeyResponse {
  return {
    id: entity.id,
    name: entity.name,
    keyPrefix: entity.keyPrefix,
    createdAt: entity.createdAt,
    lastUsedAt: entity.lastUsedAt,
    revokedAt: entity.revokedAt,
  };
}
