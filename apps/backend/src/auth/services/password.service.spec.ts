import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password and verifies it matches', async () => {
    const hash = await service.hash('correct-horse-battery');
    await expect(service.verify(hash, 'correct-horse-battery')).resolves.toBe(
      true,
    );
  });

  it('rejects an incorrect password against the hash', async () => {
    const hash = await service.hash('correct-horse-battery');
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('produces a hash that does not equal the plaintext', async () => {
    const hash = await service.hash('correct-horse-battery');
    expect(hash).not.toBe('correct-horse-battery');
  });
});
