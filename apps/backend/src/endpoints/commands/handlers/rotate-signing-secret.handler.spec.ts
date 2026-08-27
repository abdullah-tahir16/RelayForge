import { NotFoundException } from '@nestjs/common';
import { RotateSigningSecretHandler } from './rotate-signing-secret.handler';
import { RotateSigningSecretCommand } from '../impl/rotate-signing-secret.command';

describe('RotateSigningSecretHandler', () => {
  it('does not begin a transaction when workspace authorization fails', async () => {
    const authorization = {
      getOwnedEndpoint: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Endpoint not found')),
    };
    const dataSource = { transaction: jest.fn() };
    const handler = new RotateSigningSecretHandler(
      authorization as never,
      { issue: jest.fn() } as never,
      dataSource as never,
    );

    await expect(
      handler.execute(new RotateSigningSecretCommand('user', 'endpoint')),
    ).rejects.toThrow('Endpoint not found');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('propagates transactional persistence failure without returning replacement material', async () => {
    const endpoint = { id: 'endpoint', signingSecretVersion: 4 };
    const repository = {
      createQueryBuilder: () => ({
        setLock: () => ({
          where: () => ({ getOne: async () => endpoint }),
        }),
      }),
      save: jest.fn().mockRejectedValue(new Error('write failed')),
    };
    const dataSource = {
      transaction: (work: (manager: unknown) => Promise<unknown>) =>
        work({ getRepository: () => repository }),
    };
    const handler = new RotateSigningSecretHandler(
      { getOwnedEndpoint: jest.fn().mockResolvedValue(endpoint) } as never,
      {
        issue: () => ({
          signingSecret: 'rfs_new',
          signingSecretEncrypted: 'v1.new.cipher.tag',
          signingSecretHash: 'b'.repeat(64),
          signingSecretVersion: 5,
          signingSecretRotatedAt: new Date(),
        }),
      } as never,
      dataSource as never,
    );

    await expect(
      handler.execute(new RotateSigningSecretCommand('user', 'endpoint')),
    ).rejects.toThrow('write failed');
  });
});
