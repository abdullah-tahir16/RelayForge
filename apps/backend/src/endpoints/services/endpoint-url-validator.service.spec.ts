import { EndpointUrlValidatorService } from './endpoint-url-validator.service';

describe('EndpointUrlValidatorService', () => {
  const validator = new EndpointUrlValidatorService();

  it('accepts a valid https URL', () => {
    expect(validator.validate('https://example.com/webhook')).toEqual({
      valid: true,
    });
  });

  it('accepts a valid http URL', () => {
    expect(validator.validate('http://example.com/webhook')).toEqual({
      valid: true,
    });
  });

  it('rejects a malformed URL', () => {
    expect(validator.validate('not a url')).toEqual({
      valid: false,
      reason: 'malformed',
    });
  });

  it('rejects a non-http(s) scheme', () => {
    expect(validator.validate('ftp://example.com/file')).toEqual({
      valid: false,
      reason: 'unsupported-scheme',
    });
  });

  const blockedLiterals = [
    'http://localhost/webhook',
    'http://LOCALHOST/webhook',
    'http://127.0.0.1/webhook',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.5/webhook',
    'http://172.16.0.5/webhook',
    'http://172.31.255.255/webhook',
    'http://192.168.1.1/webhook',
    'http://[::1]/webhook',
  ];

  it.each(blockedLiterals)('rejects blocklisted literal %s', (url) => {
    expect(validator.validate(url)).toEqual({
      valid: false,
      reason: 'blocked-hostname',
    });
  });

  it('does not block a private-range-adjacent public IP', () => {
    expect(validator.validate('http://172.32.0.1/webhook')).toEqual({
      valid: true,
    });
  });

  it('does not block an ordinary DNS hostname (DNS resolution is out of scope)', () => {
    expect(validator.validate('https://internal.example.com/webhook')).toEqual({
      valid: true,
    });
  });
});
