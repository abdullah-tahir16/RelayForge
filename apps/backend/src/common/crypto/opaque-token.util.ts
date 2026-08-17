import { randomBytes, createHash } from 'crypto';

export interface OpaqueToken {
  raw: string;
  hash: string;
}

export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateOpaqueToken(byteLength = 32): OpaqueToken {
  const raw = randomBytes(byteLength).toString('hex');
  return { raw, hash: hashOpaqueToken(raw) };
}
