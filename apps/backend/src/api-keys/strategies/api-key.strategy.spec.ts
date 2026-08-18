import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyStrategy } from './api-key.strategy';
import { ApiKeysRepository } from '../repositories/api-keys.repository';
import { hashOpaqueToken } from '../../common/crypto/opaque-token.util';
import { ApiKeyEntity } from '../entities/api-key.entity';

describe('ApiKeyStrategy', () => {
  const token = 'rf_live_deadbeef';
  const keyHash = hashOpaqueToken(token);

  function makeStrategy(apiKey: ApiKeyEntity | null) {
    const repository = {
      findByHash: jest.fn().mockResolvedValue(apiKey),
      touchLastUsedAt: jest.fn().mockResolvedValue(undefined),
    } as unknown as ApiKeysRepository;
    return { strategy: new ApiKeyStrategy(repository), repository };
  }

  it('resolves the api key context for a valid, non-revoked key', async () => {
    const apiKey = {
      id: 'key_1',
      projectId: 'project_1',
      keyHash,
      revokedAt: null,
    } as ApiKeyEntity;
    const { strategy, repository } = makeStrategy(apiKey);

    const result = await strategy.validate(token);

    expect(result).toEqual({ apiKeyId: 'key_1', projectId: 'project_1' });
    expect(repository.touchLastUsedAt).toHaveBeenCalledWith('key_1');
  });

  it('rejects a token that matches no stored key hash', async () => {
    const { strategy } = makeStrategy(null);
    await expect(strategy.validate(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token matching a revoked key', async () => {
    const apiKey = {
      id: 'key_1',
      projectId: 'project_1',
      keyHash,
      revokedAt: new Date(),
    } as ApiKeyEntity;
    const { strategy } = makeStrategy(apiKey);
    await expect(strategy.validate(token)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
