import { EndpointEntity } from '../entities/endpoint.entity';
import { toEndpointResponse } from './endpoint-response.dto';

describe('toEndpointResponse', () => {
  it('returns only safe endpoint fields', () => {
    const endpoint = Object.assign(new EndpointEntity(), {
      id: 'endpoint-id',
      projectId: 'project-id',
      name: 'Endpoint',
      url: 'https://example.test/hook',
      description: null,
      enabled: true,
      timeoutMs: 10000,
      signingSecretEncrypted: 'v1.secret.cipher.tag',
      signingSecretHash: 'a'.repeat(64),
      signingSecretVersion: 2,
      signingSecretRotatedAt: new Date('2026-08-27T00:00:00Z'),
      disabledAt: null,
      createdAt: new Date('2026-08-26T00:00:00Z'),
      updatedAt: new Date('2026-08-27T00:00:00Z'),
    });

    const response = toEndpointResponse(endpoint);
    expect(response).toMatchObject({
      id: 'endpoint-id',
      signingSecretVersion: 2,
      signingSecretRotatedAt: new Date('2026-08-27T00:00:00Z'),
    });
    expect(response).not.toHaveProperty('signingSecretEncrypted');
    expect(response).not.toHaveProperty('signingSecretHash');
    expect(response).not.toHaveProperty('signingSecret');
  });
});
