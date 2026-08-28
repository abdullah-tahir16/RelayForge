import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TestEndpointCommand } from '../impl/test-endpoint.command';
import { TestEndpointHandler } from './test-endpoint.handler';

describe('TestEndpointHandler', () => {
  it('does not persist anything when workspace authorization fails', async () => {
    const authorization = {
      getOwnedEndpoint: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Endpoint not found')),
    };
    const dataSource = { transaction: jest.fn(), query: jest.fn() };
    const producer = { publish: jest.fn() };
    const handler = new TestEndpointHandler(
      authorization as never,
      dataSource as never,
      producer as never,
    );

    await expect(
      handler.execute(new TestEndpointCommand('user', 'endpoint')),
    ).rejects.toThrow('Endpoint not found');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(producer.publish).not.toHaveBeenCalled();
  });

  it('rejects disabled endpoints before persistence', async () => {
    const authorization = {
      getOwnedEndpoint: jest.fn().mockResolvedValue({
        id: 'endpoint',
        enabled: false,
      }),
    };
    const dataSource = { transaction: jest.fn(), query: jest.fn() };
    const producer = { publish: jest.fn() };
    const handler = new TestEndpointHandler(
      authorization as never,
      dataSource as never,
      producer as never,
    );

    await expect(
      handler.execute(new TestEndpointCommand('user', 'endpoint')),
    ).rejects.toThrow(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(producer.publish).not.toHaveBeenCalled();
  });

  it('returns a retryable failure when publication fails after persistence', async () => {
    const prepared = {
      response: {
        eventId: 'event',
        deliveryId: 'delivery',
        runId: 'run',
        runNumber: 1,
        status: 'started' as const,
      },
      projectId: 'project',
      message: { deliveryId: 'delivery' },
    };
    const dataSource = {
      transaction: jest.fn().mockResolvedValue(prepared),
      query: jest.fn(),
    };
    const producer = {
      publish: jest.fn().mockRejectedValue(new Error('kafka unavailable')),
    };
    const handler = new TestEndpointHandler(
      {
        getOwnedEndpoint: jest.fn().mockResolvedValue({
          id: 'endpoint',
          enabled: true,
        }),
      } as never,
      dataSource as never,
      producer as never,
    );
    Object.assign(handler, {
      loadEndpointWithSigning: jest.fn().mockResolvedValue({
        id: 'endpoint',
        projectId: 'project',
        url: 'https://example.com/webhook',
        timeoutMs: 10000,
        enabled: true,
        signingSecretEncrypted: 'v1.nonce.cipher.tag',
        signingSecretVersion: 1,
      }),
    });

    await expect(
      handler.execute(new TestEndpointCommand('user', 'endpoint')),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
