import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenHandler } from './refresh-token.handler';
import { RefreshTokenCommand } from '../impl/refresh-token.command';

describe('RefreshTokenHandler', () => {
  function buildHandler(existingRow: any) {
    const refreshTokensRepository = {
      findByTokenHash: jest.fn().mockResolvedValue(existingRow),
      revokeFamily: jest.fn().mockResolvedValue(undefined),
    };
    const tokenService = {
      hashRefreshToken: jest.fn((raw: string) => `hash-of-${raw}`),
      isRefreshTokenExpired: jest.fn(() => false),
      generateRefreshToken: jest
        .fn()
        .mockReturnValue({ raw: 'new-raw-token', hash: 'new-token-hash' }),
      signAccessToken: jest.fn(() => 'signed-access-token'),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          update: jest.fn().mockResolvedValue(undefined),
          create: jest.fn((_entity: any, data: any) => data),
          save: jest.fn().mockResolvedValue(undefined),
        };
        return cb(manager);
      }),
    };

    const handler = new RefreshTokenHandler(
      dataSource as any,
      refreshTokensRepository as any,
      tokenService as any,
    );

    return { handler, refreshTokensRepository, tokenService, dataSource };
  }

  it('rotates a valid, not-yet-used refresh token', async () => {
    const { handler, refreshTokensRepository, dataSource } = buildHandler({
      id: 'row-1',
      userId: 'user-1',
      familyId: 'family-1',
      rotatedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await handler.execute(
      new RefreshTokenCommand('presented-raw-token'),
    );

    expect(result).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: 'new-raw-token',
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(refreshTokensRepository.revokeFamily).not.toHaveBeenCalled();
  });

  it('revokes the entire family and rejects when a rotated token is reused', async () => {
    const { handler, refreshTokensRepository } = buildHandler({
      id: 'row-1',
      userId: 'user-1',
      familyId: 'family-1',
      rotatedAt: new Date(), // already exchanged once before
      revokedAt: null,
      createdAt: new Date(),
    });

    await expect(
      handler.execute(new RefreshTokenCommand('already-used-raw-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(refreshTokensRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
    );
  });

  it('rejects a token whose family has already been revoked', async () => {
    const { handler } = buildHandler({
      id: 'row-1',
      userId: 'user-1',
      familyId: 'family-1',
      rotatedAt: null,
      revokedAt: new Date(),
      createdAt: new Date(),
    });

    await expect(
      handler.execute(new RefreshTokenCommand('revoked-raw-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown refresh token', async () => {
    const { handler } = buildHandler(null);

    await expect(
      handler.execute(new RefreshTokenCommand('unknown-raw-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
