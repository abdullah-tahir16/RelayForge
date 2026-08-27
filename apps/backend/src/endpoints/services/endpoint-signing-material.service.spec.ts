import { ConfigService } from '@nestjs/config';
import {
  decryptSigningSecret,
  hashSigningSecret,
} from '@relayforge/webhook-signing';
import { EndpointSigningMaterialService } from './endpoint-signing-material.service';

describe('EndpointSigningMaterialService', () => {
  const key = Buffer.alloc(32, 7);
  const service = new EndpointSigningMaterialService(
    new ConfigService({ signing: { encryptionKey: key } }),
  );

  it('issues unique encrypted material with the requested version', () => {
    const now = new Date('2026-08-27T12:00:00Z');
    const first = service.issue(3, now);
    const second = service.issue(3, now);
    expect(first.signingSecret).toMatch(/^rfs_[A-Za-z0-9_-]{43}$/);
    expect(first.signingSecret).not.toBe(second.signingSecret);
    expect(decryptSigningSecret(first.signingSecretEncrypted, key)).toBe(
      first.signingSecret,
    );
    expect(first.signingSecretHash).toBe(
      hashSigningSecret(first.signingSecret),
    );
    expect(first.signingSecretVersion).toBe(3);
    expect(first.signingSecretRotatedAt).toBe(now);
  });
});
