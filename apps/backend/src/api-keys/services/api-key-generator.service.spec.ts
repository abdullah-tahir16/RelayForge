import { ApiKeyGeneratorService } from './api-key-generator.service';
import { hashOpaqueToken } from '../../common/crypto/opaque-token.util';

describe('ApiKeyGeneratorService', () => {
  const service = new ApiKeyGeneratorService();

  it('produces a key in the documented rf_live_ format', () => {
    const { key } = service.generate();
    expect(key).toMatch(/^rf_live_[0-9a-f]{32}$/);
  });

  it('derives the prefix as rf_live_ plus the first 4 characters of the random part', () => {
    const { key, prefix } = service.generate();
    expect(prefix).toBe(key.slice(0, 'rf_live_'.length + 4));
  });

  it('hashes the full key (including the rf_live_ prefix), not just the random suffix', () => {
    const { key, hash } = service.generate();
    expect(hash).toBe(hashOpaqueToken(key));
  });

  it('never returns the same key twice', () => {
    const first = service.generate();
    const second = service.generate();
    expect(first.key).not.toBe(second.key);
  });
});
