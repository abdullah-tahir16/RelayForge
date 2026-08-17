import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateEndpointDto } from './create-endpoint.dto';

describe('CreateEndpointDto timeout bounds', () => {
  async function validateDto(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateEndpointDto, payload);
    return validate(dto);
  }

  it('accepts a request with no timeout specified (default applied elsewhere)', async () => {
    const errors = await validateDto({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts a timeout within bounds', async () => {
    const errors = await validateDto({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
      timeoutMs: 5000,
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts the maximum allowed timeout', async () => {
    const errors = await validateDto({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
      timeoutMs: 30000,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a timeout above the maximum', async () => {
    const errors = await validateDto({
      name: 'Fulfilment',
      url: 'https://example.com/webhook',
      timeoutMs: 30001,
    });
    expect(errors.some((e) => e.property === 'timeoutMs')).toBe(true);
  });
});
