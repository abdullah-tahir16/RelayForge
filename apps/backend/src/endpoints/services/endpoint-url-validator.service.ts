import { Injectable } from '@nestjs/common';

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isBlockedIpv4(hostname: string): boolean {
  const match = IPV4_PATTERN.exec(hostname);
  if (!match) {
    return false;
  }
  const octets = match.slice(1, 5).map((part) => Number(part));
  if (octets.some((octet) => octet > 255)) {
    return false;
  }
  const [a, b] = octets;

  if (a === 127) return true; // loopback (127.0.0.0/8)
  if (a === 169 && b === 254) return true; // link-local, incl. 169.254.169.254
  if (a === 10) return true; // private (10.0.0.0/8)
  if (a === 172 && b >= 16 && b <= 31) return true; // private (172.16.0.0/12)
  if (a === 192 && b === 168) return true; // private (192.168.0.0/16)

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized === '::1' || normalized === '[::1]') {
    return true;
  }
  return isBlockedIpv4(normalized);
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: 'malformed' | 'unsupported-scheme' | 'blocked-hostname';
}

@Injectable()
export class EndpointUrlValidatorService {
  validate(url: string): UrlValidationResult {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, reason: 'malformed' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'unsupported-scheme' };
    }

    if (isBlockedHostname(parsed.hostname)) {
      return { valid: false, reason: 'blocked-hostname' };
    }

    return { valid: true };
  }
}
