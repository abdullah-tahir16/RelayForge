import configuration from './configuration';

describe('backend signing configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SIGNING_SECRET_ENCRYPTION_KEY;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses an explicit development-only key outside production', () => {
    expect(configuration().signing.encryptionKey).toEqual(Buffer.alloc(32));
  });

  it('fails secret-safely for missing or malformed production keys', () => {
    process.env.NODE_ENV = 'production';
    expect(() => configuration()).toThrow(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
    process.env.SIGNING_SECRET_ENCRYPTION_KEY = 'secret-value-that-must-not-echo';
    expect(() => configuration()).toThrow(
      'SIGNING_SECRET_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes',
    );
  });
});
